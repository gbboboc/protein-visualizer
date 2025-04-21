import mongoose from 'mongoose'

const exportSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  proteinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Protein',
  },
  exportType: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

const Export = mongoose.models.Export || mongoose.model('Export', exportSchema)

export default Export 