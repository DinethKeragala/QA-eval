import mongoose from 'mongoose';

const runtimePeriodSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: false, index: true },
  },
  { timestamps: true }
);

runtimePeriodSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const RuntimePeriod = mongoose.model('RuntimePeriod', runtimePeriodSchema);
