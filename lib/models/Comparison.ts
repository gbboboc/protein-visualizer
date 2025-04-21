import mongoose from 'mongoose'

const comparisonSchema = new mongoose.Schema({
  userId: {
    type: String,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Protein',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

const Comparison = mongoose.models.Comparison || mongoose.model('Comparison', comparisonSchema)

export default Comparison 