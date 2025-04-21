import mongoose from 'mongoose'

interface IProtein extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  sequence: string
  description: string
  isPublic: boolean
  directions?: string
  createdAt: Date
  updatedAt: Date
}

const proteinSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sequence: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  directions: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // This will automatically manage createdAt and updatedAt
  versionKey: false // This will remove the __v field
})

// Only create the model if it doesn't exist
const Protein = mongoose.models.Protein || mongoose.model<IProtein>('Protein', proteinSchema)

export default Protein 