import mongoose, { Schema, Document } from 'mongoose';
import { JobStatus, JobPriority, AlgorithmType } from '../types/job-types';

export interface IJob extends Document {
  userId: mongoose.Types.ObjectId;
  algorithm: AlgorithmType;
  sequence: string;
  parameters: Record<string, any>;
  status: JobStatus;
  priority: JobPriority;
  progress: number;
  result?: {
    bestConformation?: {
      sequence: string;
      directions: string[];
      energy: number;
      positions: Array<{ x: number; y: number; z: number }>;
    };
    energyHistory?: Array<{ iteration: number; energy: number }>;
    totalIterations?: number;
    convergenceTime?: number;
    metadata?: Record<string, any>;
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  bullJobId?: string;
}

const jobSchema = new Schema<IJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  algorithm: {
    type: String,
    enum: Object.values(AlgorithmType),
    required: true,
    index: true
  },
  sequence: {
    type: String,
    required: true,
    index: true
  },
  parameters: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  status: {
    type: String,
    enum: Object.values(JobStatus),
    required: true,
    default: JobStatus.QUEUED,
    index: true
  },
  priority: {
    type: Number,
    enum: Object.values(JobPriority),
    required: true,
    default: JobPriority.NORMAL,
    index: true
  },
  progress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  result: {
    bestConformation: {
      sequence: String,
      directions: [String],
      energy: Number,
      positions: [{
        x: Number,
        y: Number,
        z: Number
      }]
    },
    energyHistory: [{
      iteration: Number,
      energy: Number
    }],
    totalIterations: Number,
    convergenceTime: Number,
    metadata: Schema.Types.Mixed
  },
  error: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  startedAt: {
    type: Date,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  estimatedDuration: {
    type: Number, // in seconds
    min: 0
  },
  actualDuration: {
    type: Number, // in seconds
    min: 0
  },
  bullJobId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for efficient querying
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1, priority: -1 });
jobSchema.index({ algorithm: 1, status: 1 });
jobSchema.index({ completedAt: 1 }, { sparse: true });

// Virtual for actual duration calculation
jobSchema.virtual('calculatedDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  return undefined;
});

// Pre-save middleware to calculate actual duration
jobSchema.pre('save', function(next) {
  if (this.isModified('completedAt') && this.completedAt && this.startedAt) {
    this.actualDuration = Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  next();
});

// Static methods
jobSchema.statics.findActiveJobs = function() {
  return this.find({ 
    status: { $in: [JobStatus.QUEUED, JobStatus.RUNNING] } 
  }).sort({ priority: -1, createdAt: 1 });
};

jobSchema.statics.findJobsByStatus = function(status: JobStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

jobSchema.statics.findUserJobs = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

jobSchema.statics.findOldJobs = function(daysOld: number = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.find({
    status: { $in: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED] },
    completedAt: { $lt: cutoffDate }
  });
};

// Instance methods
jobSchema.methods.isCompleted = function() {
  return this.status === JobStatus.COMPLETED;
};

jobSchema.methods.isFailed = function() {
  return this.status === JobStatus.FAILED;
};

jobSchema.methods.isRunning = function() {
  return this.status === JobStatus.RUNNING;
};

jobSchema.methods.isQueued = function() {
  return this.status === JobStatus.QUEUED;
};

jobSchema.methods.getEstimatedCompletion = function() {
  if (this.startedAt && this.estimatedDuration) {
    return new Date(this.startedAt.getTime() + this.estimatedDuration * 1000);
  }
  return undefined;
};

// Create and export the model
const Job = mongoose.models.Job || mongoose.model<IJob>('Job', jobSchema);

export default Job;
