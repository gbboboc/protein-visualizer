import mongoose from 'mongoose'

const energySimulationSchema = new mongoose.Schema({
  proteinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Protein',
    required: true,
  },
  algorithmType: {
    type: String,
    required: true,
  },
  initialEnergy: {
    type: Number,
    required: true,
  },
  finalEnergy: {
    type: Number,
    required: true,
  },
  iterations: {
    type: Number,
    required: true,
  },
  temperature: {
    type: Number,
    required: true,
  },
  resultSequence: {
    type: String,
    required: true,
  },
  resultDirections: {
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

const EnergySimulation = mongoose.models.EnergySimulation || mongoose.model('EnergySimulation', energySimulationSchema)

export default EnergySimulation 