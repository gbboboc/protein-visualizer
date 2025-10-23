import mongoose, { Schema, Document } from 'mongoose'

interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  jobStats?: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    totalRuntime: number // in seconds
    lastJobAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  jobStats: {
    totalJobs: {
      type: Number,
      default: 0
    },
    completedJobs: {
      type: Number,
      default: 0
    },
    failedJobs: {
      type: Number,
      default: 0
    },
    totalRuntime: {
      type: Number,
      default: 0 // in seconds
    },
    lastJobAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  versionKey: false
})

// Index for job statistics queries
userSchema.index({ 'jobStats.lastJobAt': -1 })

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema)

export default User 