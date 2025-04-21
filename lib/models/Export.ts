import mongoose from 'mongoose'

const exportSchema = new mongoose.Schema({
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
  format: {
    type: String,
    required: true,
    enum: ['pdb', 'csv', 'json'],
  },
  data: {
    type: String,
    required: true,
  },
  proteinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Protein',
    required: true,
  },
}, {
  timestamps: true,
  versionKey: false
})

const Export = mongoose.models.Export || mongoose.model('Export', exportSchema)

export default Export 