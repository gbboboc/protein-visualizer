import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import Job from "@/lib/models/Job";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

// Server-Sent Events endpoint for real-time job progress updates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        };

        // Send connection established event
        sendEvent('connected', {
          message: 'Connected to job stream',
          userId: session.user.id,
          timestamp: new Date().toISOString()
        });

        // Set up MongoDB change stream to watch for job updates
        let changeStream: any = null;
        
        const setupChangeStream = async () => {
          try {
            // Convert session.user.id (string) to ObjectId for proper comparison
            const userIdObjectId = new mongoose.Types.ObjectId(session.user.id);
            
            // Watch for changes to jobs belonging to this user
            changeStream = Job.watch([
              {
                $match: {
                  'fullDocument.userId': userIdObjectId,
                  'operationType': { $in: ['update', 'insert', 'replace'] }
                }
              }
            ]);

            changeStream.on('change', (change: any) => {
              const job = change.fullDocument;
              
              if (job) {
                // Send job update event
                sendEvent('jobUpdate', {
                  jobId: job._id.toString(),
                  status: job.status,
                  progress: job.progress,
                  result: job.result,
                  error: job.error,
                  createdAt: job.createdAt,
                  startedAt: job.startedAt,
                  completedAt: job.completedAt,
                  estimatedCompletion: job.estimatedDuration && job.startedAt
                    ? new Date(job.startedAt.getTime() + job.estimatedDuration * 1000)
                    : undefined
                });
              }
            });

            changeStream.on('error', (error: any) => {
              console.error('Change stream error:', error);
              sendEvent('error', { message: 'Stream error occurred' });
            });

          } catch (error) {
            console.error('Failed to setup change stream:', error);
            sendEvent('error', { message: 'Failed to setup job monitoring' });
          }
        };

        // Setup the change stream
        setupChangeStream();

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('Client disconnected from job stream');
          if (changeStream) {
            changeStream.close();
          }
          controller.close();
        });

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            sendEvent('heartbeat', { timestamp: new Date().toISOString() });
          } catch (error) {
            clearInterval(heartbeat);
            if (changeStream) {
              changeStream.close();
            }
            controller.close();
          }
        }, 30000);

        // Cleanup function
        const cleanup = () => {
          clearInterval(heartbeat);
          if (changeStream) {
            changeStream.close();
          }
        };

        // Store cleanup function for later use
        (controller as any).cleanup = cleanup;
      },

      cancel() {
        // Cleanup when stream is cancelled
        const cleanup = (this as any).cleanup;
        if (cleanup) {
          cleanup();
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error("Error setting up job stream:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
