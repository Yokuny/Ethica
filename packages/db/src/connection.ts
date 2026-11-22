import mongoose from 'mongoose';

export const connect = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

export const disconnect = async (): Promise<void> => {
  await mongoose.disconnect();
};

// Health check of a service that only talks to the database (the worker's `/health`, AD-267).
export const isConnected = (): boolean => mongoose.connection.readyState === 1;
