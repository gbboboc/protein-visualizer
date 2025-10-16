import { ObjectId } from 'mongoose';
import { Direction } from '../types';

// Job Status Enum
export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

// Job Priority Enum
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 15
}

// Algorithm Types
export enum AlgorithmType {
  MONTE_CARLO = 'monte-carlo',
  SIMULATED_ANNEALING = 'simulated-annealing',
  GENETIC_ALGORITHM = 'genetic-algorithm',
  EVOLUTION_STRATEGIES = 'evolution-strategies',
  EVOLUTIONARY_PROGRAMMING = 'evolutionary-programming',
  GENETIC_PROGRAMMING = 'genetic-programming',
  ROSETTA = 'rosetta'
}

// Job Data Interface
export interface JobData {
  userId: string;
  algorithm: AlgorithmType;
  sequence: string;
  parameters: Record<string, any>;
  priority?: JobPriority;
  estimatedDuration?: number; // in seconds
}

// Job Result Interface
export interface JobResult {
  bestConformation?: {
    sequence: string;
    directions: Direction[];
    energy: number;
    positions: Array<{ x: number; y: number; z: number }>;
  };
  energyHistory?: Array<{ iteration: number; energy: number }>;
  totalIterations?: number;
  convergenceTime?: number;
  metadata?: Record<string, any>;
}

// Job Interface (Database Model)
export interface IJob {
  _id: ObjectId;
  userId: ObjectId;
  algorithm: AlgorithmType;
  sequence: string;
  parameters: Record<string, any>;
  status: JobStatus;
  priority: JobPriority;
  progress: number; // 0-100
  result?: JobResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  bullJobId?: string; // Reference to Bull queue job
}

// Job Progress Interface
export interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentEnergy?: number;
  bestEnergy?: number;
  iteration?: number;
  message?: string;
  timestamp: Date;
}

// Job Queue Configuration
export interface JobQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: 'exponential';
      delay: number;
    };
  };
}

// Job Worker Interface
export interface JobWorker {
  process: (job: any) => Promise<JobResult>;
  onComplete?: (job: any, result: JobResult) => Promise<void>;
  onFailed?: (job: any, error: Error) => Promise<void>;
}

// Job Submission Response
export interface JobSubmissionResponse {
  success: boolean;
  jobId?: string;
  error?: string;
  estimatedCompletion?: Date;
}

// Job Status Response
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: JobResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}
