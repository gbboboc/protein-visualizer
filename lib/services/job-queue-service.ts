/**
 * Job Queue Service - Manages background job processing using Bull Queue
 * Handles job submission, monitoring, and cleanup for protein folding algorithms
 */

import Queue from 'bull';
import { 
  JobData, 
  JobResult, 
  JobProgress, 
  JobStatus, 
  JobPriority,
  AlgorithmType,
  JobQueueConfig,
  JobSubmissionResponse,
  JobStatusResponse
} from '../types/job-types';
import Job from '../models/Job';
import User from '../models/User';
import connectDB from '../mongodb';

class JobQueueService {
  private queue: Queue.Queue;
  private config: JobQueueConfig;
  private isInitialized: boolean = false;

  constructor() {
    // Default configuration - can be overridden with environment variables
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5,      // Keep last 5 failed jobs
        attempts: 3,          // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential' as const,
          delay: 2000         // Start with 2 second delay
        }
      }
    };

    this.queue = new Queue('protein-folding-jobs', {
      redis: this.config.redis,
      defaultJobOptions: this.config.defaultJobOptions
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize the job queue service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await connectDB();
      await this.queue.isReady();
      this.isInitialized = true;
      console.log('Job Queue Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Job Queue Service:', error);
      throw error;
    }
  }

  /**
   * Submit a new job to the queue
   */
  async submitJob(jobData: JobData): Promise<JobSubmissionResponse> {
    try {
      await this.initialize();

      // Create job in database first
      const dbJob = new Job({
        userId: jobData.userId,
        algorithm: jobData.algorithm,
        sequence: jobData.sequence,
        parameters: jobData.parameters,
        priority: jobData.priority || JobPriority.NORMAL,
        status: JobStatus.QUEUED,
        progress: 0,
        estimatedDuration: jobData.estimatedDuration,
        createdAt: new Date()
      });

      const savedJob = await dbJob.save();

      // Add job to Bull queue
      const bullJob = await this.queue.add(
        jobData.algorithm,
        {
          jobId: savedJob._id.toString(),
          ...jobData
        },
        {
          priority: jobData.priority || JobPriority.NORMAL,
          delay: 0,
          jobId: savedJob._id.toString() // Use MongoDB ID as Bull job ID
        }
      );

      // Update database with Bull job ID
      savedJob.bullJobId = bullJob.id?.toString();
      await savedJob.save();

      // Calculate estimated completion time
      const estimatedCompletion = jobData.estimatedDuration 
        ? new Date(Date.now() + jobData.estimatedDuration * 1000)
        : undefined;

      return {
        success: true,
        jobId: savedJob._id.toString(),
        estimatedCompletion
      };

    } catch (error) {
      console.error('Failed to submit job:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    try {
      await this.initialize();

      const job = await Job.findById(jobId);
      if (!job) {
        return null;
      }

      // Get additional info from Bull queue if available
      let bullJob = null;
      if (job.bullJobId) {
        try {
          bullJob = await this.queue.getJob(job.bullJobId);
        } catch (error) {
          // Bull job might have been cleaned up
          console.warn(`Bull job ${job.bullJobId} not found for job ${jobId}`);
        }
      }

      const estimatedCompletion = job.estimatedDuration && job.startedAt
        ? new Date(job.startedAt.getTime() + job.estimatedDuration * 1000)
        : undefined;

      return {
        jobId: job._id.toString(),
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        estimatedCompletion
      };

    } catch (error) {
      console.error('Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.initialize();

      const job = await Job.findById(jobId);
      if (!job) {
        return false;
      }

      // Cancel in Bull queue if still running
      if (job.bullJobId && job.status === JobStatus.RUNNING) {
        try {
          const bullJob = await this.queue.getJob(job.bullJobId);
          if (bullJob) {
            await bullJob.remove();
          }
        } catch (error) {
          console.warn(`Failed to cancel Bull job ${job.bullJobId}:`, error);
        }
      }

      // Update database status
      job.status = JobStatus.CANCELLED;
      job.completedAt = new Date();
      await job.save();

      return true;

    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Get jobs for a user
   */
  async getUserJobs(userId: string, limit: number = 50): Promise<JobStatusResponse[]> {
    try {
      await this.initialize();

      const jobs = await Job.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      return jobs.map(job => ({
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
      }));

    } catch (error) {
      console.error('Failed to get user jobs:', error);
      return [];
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    try {
      await this.initialize();

      const updateData: any = {
        status: progress.status,
        progress: progress.progress
      };

      if (progress.status === JobStatus.RUNNING && !progress.startedAt) {
        updateData.startedAt = new Date();
      }

      if (progress.status === JobStatus.COMPLETED || progress.status === JobStatus.FAILED) {
        updateData.completedAt = new Date();
      }

      // Update the job in database - this will trigger SSE updates via MongoDB change stream
      await Job.findByIdAndUpdate(jobId, updateData);

      // The SSE endpoint will automatically detect this change and stream it to connected clients

    } catch (error) {
      console.error('Failed to update job progress:', error);
    }
  }

  /**
   * Setup event handlers for the queue
   */
  private setupEventHandlers(): void {
    // Job started
    this.queue.on('active', async (job) => {
      console.log(`Job ${job.id} started`);
      try {
        await this.updateJobProgress(job.data.jobId, {
          jobId: job.data.jobId,
          status: JobStatus.RUNNING,
          progress: 0,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Failed to update job progress on start:', error);
      }
    });

    // Job completed
    this.queue.on('completed', async (job, result) => {
      console.log(`Job ${job.id} completed`);
      try {
        const updatedJob = await Job.findByIdAndUpdate(job.data.jobId, {
          status: JobStatus.COMPLETED,
          progress: 100,
          result: result,
          completedAt: new Date()
        });

        // Update user job statistics
        if (updatedJob) {
          await this.updateUserJobStats(updatedJob.userId.toString(), 'completed');
        }
      } catch (error) {
        console.error('Failed to update job on completion:', error);
      }
    });

    // Job failed
    this.queue.on('failed', async (job, error) => {
      console.log(`Job ${job.id} failed:`, error.message);
      try {
        const updatedJob = await Job.findByIdAndUpdate(job.data.jobId, {
          status: JobStatus.FAILED,
          error: error.message,
          completedAt: new Date()
        });

        // Update user job statistics
        if (updatedJob) {
          await this.updateUserJobStats(updatedJob.userId.toString(), 'failed');
        }
      } catch (updateError) {
        console.error('Failed to update job on failure:', updateError);
      }
    });

    // Job progress
    this.queue.on('progress', async (job, progress) => {
      try {
        await this.updateJobProgress(job.data.jobId, {
          jobId: job.data.jobId,
          status: JobStatus.RUNNING,
          progress: progress.progress || 0,
          currentEnergy: progress.currentEnergy,
          bestEnergy: progress.bestEnergy,
          iteration: progress.iteration,
          message: progress.message,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Failed to update job progress:', error);
      }
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      await this.initialize();
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      };

    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      await this.initialize();

      // Remove jobs older than 7 days
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      await Job.deleteMany({
        status: { $in: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED] },
        completedAt: { $lt: cutoffDate }
      });

      console.log('Old jobs cleaned up successfully');

    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
    }
  }

  /**
   * Update user job statistics
   */
  private async updateUserJobStats(userId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      const updateFields: any = {
        $inc: { 'jobStats.totalJobs': 1 },
        $set: { 'jobStats.lastJobAt': new Date() }
      };

      if (status === 'completed') {
        updateFields.$inc['jobStats.completedJobs'] = 1;
      } else if (status === 'failed') {
        updateFields.$inc['jobStats.failedJobs'] = 1;
      }

      await User.findByIdAndUpdate(userId, updateFields);
    } catch (error) {
      console.error('Failed to update user job statistics:', error);
    }
  }

  /**
   * Get user job statistics
   */
  async getUserJobStats(userId: string): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalRuntime: number;
    lastJobAt?: Date;
  } | null> {
    try {
      await this.initialize();

      const user = await User.findById(userId).select('jobStats');
      return user?.jobStats || {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalRuntime: 0
      };

    } catch (error) {
      console.error('Failed to get user job statistics:', error);
      return null;
    }
  }

  /**
   * Gracefully shutdown the queue
   */
  async shutdown(): Promise<void> {
    try {
      await this.queue.close();
      console.log('Job Queue Service shutdown successfully');
    } catch (error) {
      console.error('Error during job queue shutdown:', error);
    }
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService();

export default JobQueueService;
