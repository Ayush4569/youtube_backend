import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channelStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      // get total likes
      $lookup: {
        from: "likes",
        foreignField: "video",
        localField: "_id",
        as: "totalLikes",
      },
    },
    {
      // get totalSubscribers
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "totalSubscribers",
      },
    },
    {
      $group: {
        _id: req.user._id,
        totalVideos: { $count: {} },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: { $size: "$totalLikes" } },
        totalSubscribers: { $sum: { $size: "$totalSubscribers" } },
      },
    },
  ]);
  if (!channelStats) {
    throw new ApiError(404, "No videos found for this channel");
  }
  // return
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Channel stats fetched successfully",
        channelStats[0]
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user._id;
  const { limit = 10, page = 1 } = req.query;
  if (!userId) {
    throw new ApiError(405, "Not authenticated");
  }
  const channelVideos = await Video.findOne({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(Number(page) * Number(limit) - Number(limit));
  if (!channelVideos) {
    throw new ApiError(404, "No videos found ! Add a video now");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channelVideos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
