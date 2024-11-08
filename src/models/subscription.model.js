import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    // subscriber is basically a user who subscribes to a channel
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // channel is also nothing but an user to who subscriber subscribes
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = model("Subscription", subscriptionSchema);
