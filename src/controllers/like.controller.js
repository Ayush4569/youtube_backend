import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  await Like.findOneAndUpdate({ _id: videoId }, [
    {
      $set: {
        video: {
          $not: "$video",
        },
      },
    },
  ]);
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  await Like.findOneAndUpdate(
    {
      _id: commentId,
    },
    [
      {
        $set: {
          comment: {
            $not: "$comment",
          },
        },
      },
    ]
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  await Like.findOneAndUpdate(
    {
      _id: tweetId,
    },
    [
      {
        $set: {
          tweet: {
            $not: "$tweet",
          },
        },
      },
    ]
  );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVideos = await Like.find({ video });
  if (!likedVideos) {
    throw new ApiError(404, "No liked videos");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked video fetched"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
