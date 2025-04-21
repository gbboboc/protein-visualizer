import mongoose, { Schema } from 'mongoose'

interface IVisualization extends Document {
  proteinId: mongoose.Types.ObjectId
  visualizationType: string
  foldingDirections?: string
  energyValue?: number
  settings?: Record<string, any>
  createdAt: Date
}

const visualizationSchema = new Schema({
  proteinId: {
    type: Schema.Types.ObjectId,
    ref: 'Protein',
    required: true,
  },
  visualizationType: {
    type: String,
    required: true,
    enum: ['2d', '3d', 'ribbon', 'space-filling', 'surface'],
  },
  foldingDirections: {
    type: String,
  },
  energyValue: {
    type: Number,
  },
  settings: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
  versionKey: false
})

const Visualization = mongoose.models.Visualization || mongoose.model<IVisualization>('Visualization', visualizationSchema)

export default Visualization 