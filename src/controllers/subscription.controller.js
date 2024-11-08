import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  //what to do
  //if true make it false remove subscriber
  //if false make it true add one subscriber in Subscriber
  //logic
  // check if channelId is valid
  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "Invalid channel id");
  }

  const userSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });
  if (!userSubscription) {
    const newSubscriber = new Subscription({
      subscriber: req.user._id,
      channel: channelId,
    });
    await newSubscriber.save();
    return res
      .status(200)
      .json(new ApiResponse(200, newSubscriber, "Channel subsribed"));
  } else {
    const cancelSubscription = await Subscription.findOneAndDelete({
      subscriber: req.user._id,
      channel: channelId,
    });
    if (!cancelSubscription) {
      throw new ApiError(404, "Subscription not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription cancelled", true));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "Channel not found");
  }
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriberDetails",
    },
    {
      $group: {
        _id: "$channel",
        subscriberCount: { $sum: 1 },
        subscribers: { $push: "$subscriberDetails" },
        createdAt: { $first: "$createdAt" },
      },
    },
    {
      $project: {
        channel: "$_id",
        createdAt: 1,
        subscriberCount: 1,
        subscribers: 1,
      },
    },
  ]);
  if (subscribers.length === 0) {
    throw new ApiError(400, "Subscribers not found");
  }
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
      },
      "Subscribers fetched successfully"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "subscribedTo",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedTo",
    },
    {
      $project: {
        _id: 0,
        channel: "$subscribedTo",
        subscriber: 1,
        createdAt: 1,
      },
    },
  ]);
  if (subscribedChannels.length === 0) {
    throw new ApiError(400, "Channels not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channels: subscribedChannels,
        channelCount: subscribedChannels.length,
      },
      "Channels fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
