import mongoose from 'mongoose'

const comparisonSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  proteins: [{
    type: String, // Store protein IDs as strings
    required: true,
  }],
}, {
  timestamps: true,
  versionKey: false
})

const Comparison = mongoose.models.Comparison || mongoose.model('Comparison', comparisonSchema)

export default Comparison 