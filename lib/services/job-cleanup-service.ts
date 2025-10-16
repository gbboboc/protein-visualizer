/**
 * Job Cleanup Service - Handles job retention policies and cleanup tasks
 * Manages automatic cleanup of old jobs and maintenance tasks
 */

import cron from 'node-cron';
import Job from '../models/Job';
import { JobStatus, AlgorithmType } from '../types/job-types';
import { jobQueueService } from './job-queue-service';
import connectDB from '../mongodb';

interface CleanupConfig {
  // Job retention periods (in days)
  retentionPeriods: {
    completed: number;
    failed: number;
    cancelled: number;
    rosetta: number; // Longer retention for Rosetta jobs
  };
  
  // Cleanup schedule (cron expression)
  cleanupSchedule: string;
  
  // Batch size for cleanup operations
  batchSize: number;
  
  // Enable/disable cleanup
  enabled: boolean;
}

class JobCleanupService {
  private config: CleanupConfig;
  private cleanupTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      retentionPeriods: {
        completed: 7,    // Keep completed jobs for 7 days
        failed: 3,       // Keep failed jobs for 3 days
        cancelled: 1,    // Keep cancelled jobs for 1 day
        rosetta: 30      // Keep Rosetta jobs for 30 days (they're more valuable)
      },
      cleanupSchedule: '0 2 * * *', // Run daily at 2 AM
      batchSize: 100,
      enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_JOB_CLEANUP === 'true'
    };
  }

  /**
   * Initialize the cleanup service
   */
  async initialize(): Promise<void> {
    try {
      await connectDB();
      
      if (this.config.enabled) {
        this.startScheduledCleanup();
        console.log('Job Cleanup Service initialized successfully');
      } else {
        console.log('Job Cleanup Service disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Job Cleanup Service:', error);
      throw error;
    }
  }

  /**
   * Start scheduled cleanup task
   */
  private startScheduledCleanup(): void {
    if (this.cleanupTask) {
      this.cleanupTask.destroy();
    }

    this.cleanupTask = cron.schedule(this.config.cleanupSchedule, async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log(`Scheduled cleanup task started with schedule: ${this.config.cleanupSchedule}`);
  }

  /**
   * Perform cleanup of old jobs
   */
  async performCleanup(): Promise<{
    completed: number;
    failed: number;
    cancelled: number;
    rosetta: number;
    total: number;
  }> {
    if (this.isRunning) {
      console.log('Cleanup already in progress, skipping...');
      return { completed: 0, failed: 0, cancelled: 0, rosetta: 0, total: 0 };
    }

    this.isRunning = true;
    const results = { completed: 0, failed: 0, cancelled: 0, rosetta: 0, total: 0 };

    try {
      console.log('Starting job cleanup...');

      // Clean up completed jobs
      results.completed = await this.cleanupJobsByStatus(
        JobStatus.COMPLETED, 
        this.config.retentionPeriods.completed
      );

      // Clean up failed jobs
      results.failed = await this.cleanupJobsByStatus(
        JobStatus.FAILED, 
        this.config.retentionPeriods.failed
      );

      // Clean up cancelled jobs
      results.cancelled = await this.cleanupJobsByStatus(
        JobStatus.CANCELLED, 
        this.config.retentionPeriods.cancelled
      );

      // Clean up Rosetta jobs (special handling)
      results.rosetta = await this.cleanupRosettaJobs();

      results.total = results.completed + results.failed + results.cancelled + results.rosetta;

      console.log(`Job cleanup completed: ${results.total} jobs removed`, results);

      // Also clean up Bull queue
      await this.cleanupBullQueue();

      return results;

    } catch (error) {
      console.error('Job cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up jobs by status and age
   */
  private async cleanupJobsByStatus(status: JobStatus, retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      const result = await Job.deleteMany({
        status,
        completedAt: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} ${status} jobs older than ${retentionDays} days`);
      return result.deletedCount || 0;

    } catch (error) {
      console.error(`Failed to cleanup ${status} jobs:`, error);
      return 0;
    }
  }

  /**
   * Clean up Rosetta jobs with special retention logic
   */
  private async cleanupRosettaJobs(): Promise<number> {
    const cutoffDate = new Date(Date.now() - this.config.retentionPeriods.rosetta * 24 * 60 * 60 * 1000);
    
    try {
      // Clean up old Rosetta jobs regardless of status
      const result = await Job.deleteMany({
        algorithm: AlgorithmType.ROSETTA,
        completedAt: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} Rosetta jobs older than ${this.config.retentionPeriods.rosetta} days`);
      return result.deletedCount || 0;

    } catch (error) {
      console.error('Failed to cleanup Rosetta jobs:', error);
      return 0;
    }
  }

  /**
   * Clean up Bull queue jobs
   */
  private async cleanupBullQueue(): Promise<void> {
    try {
      // This will clean up completed and failed jobs from Bull queue
      await jobQueueService.cleanupOldJobs();
      console.log('Bull queue cleanup completed');
    } catch (error) {
      console.error('Bull queue cleanup failed:', error);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    cancelledJobs: number;
    rosettaJobs: number;
    oldestJob: Date | null;
    jobsToCleanup: {
      completed: number;
      failed: number;
      cancelled: number;
      rosetta: number;
    };
  }> {
    try {
      const [
        totalJobs,
        completedJobs,
        failedJobs,
        cancelledJobs,
        rosettaJobs,
        oldestJob
      ] = await Promise.all([
        Job.countDocuments(),
        Job.countDocuments({ status: JobStatus.COMPLETED }),
        Job.countDocuments({ status: JobStatus.FAILED }),
        Job.countDocuments({ status: JobStatus.CANCELLED }),
        Job.countDocuments({ algorithm: AlgorithmType.ROSETTA }),
        Job.findOne({}, { createdAt: 1 }).sort({ createdAt: 1 }).then(job => job?.createdAt)
      ]);

      // Calculate jobs that would be cleaned up
      const now = new Date();
      const jobsToCleanup = {
        completed: await this.getJobsToCleanupCount(JobStatus.COMPLETED, this.config.retentionPeriods.completed),
        failed: await this.getJobsToCleanupCount(JobStatus.FAILED, this.config.retentionPeriods.failed),
        cancelled: await this.getJobsToCleanupCount(JobStatus.CANCELLED, this.config.retentionPeriods.cancelled),
        rosetta: await this.getRosettaJobsToCleanupCount()
      };

      return {
        totalJobs,
        completedJobs,
        failedJobs,
        cancelledJobs,
        rosettaJobs,
        oldestJob,
        jobsToCleanup
      };

    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        cancelledJobs: 0,
        rosettaJobs: 0,
        oldestJob: null,
        jobsToCleanup: { completed: 0, failed: 0, cancelled: 0, rosetta: 0 }
      };
    }
  }

  /**
   * Get count of jobs that would be cleaned up
   */
  private async getJobsToCleanupCount(status: JobStatus, retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      return await Job.countDocuments({
        status,
        completedAt: { $lt: cutoffDate }
      });
    } catch (error) {
      console.error(`Failed to count ${status} jobs to cleanup:`, error);
      return 0;
    }
  }

  /**
   * Get count of Rosetta jobs that would be cleaned up
   */
  private async getRosettaJobsToCleanupCount(): Promise<number> {
    const cutoffDate = new Date(Date.now() - this.config.retentionPeriods.rosetta * 24 * 60 * 60 * 1000);
    
    try {
      return await Job.countDocuments({
        algorithm: AlgorithmType.ROSETTA,
        completedAt: { $lt: cutoffDate }
      });
    } catch (error) {
      console.error('Failed to count Rosetta jobs to cleanup:', error);
      return 0;
    }
  }

  /**
   * Force cleanup now (manual trigger)
   */
  async forceCleanup(): Promise<void> {
    console.log('Manual cleanup triggered');
    await this.performCleanup();
  }

  /**
   * Update cleanup configuration
   */
  updateConfig(newConfig: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.cleanupTask) {
      this.startScheduledCleanup();
    } else if (!this.config.enabled && this.cleanupTask) {
      this.cleanupTask.destroy();
      this.cleanupTask = null;
    }
    
    console.log('Cleanup configuration updated:', this.config);
  }

  /**
   * Stop the cleanup service
   */
  async stop(): Promise<void> {
    if (this.cleanupTask) {
      this.cleanupTask.destroy();
      this.cleanupTask = null;
    }
    
    this.isRunning = false;
    console.log('Job Cleanup Service stopped');
  }

  /**
   * Check if cleanup is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): CleanupConfig {
    return { ...this.config };
  }
}

// Create and export singleton instance
export const jobCleanupService = new JobCleanupService();

export default JobCleanupService;
