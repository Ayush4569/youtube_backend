import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
   const pipeline = [];
   if(query){
    pipeline.push({
      $match : {
        title : {$regex:query,$options:"i"}
      }
    })
   }
   if(userId){
    pipeline.push({
      $match:{
        owner:mongoose.Types.ObjectId(userId)
      }
    })
   }
   pipeline.push({
    $sort:{
      [sortBy] : sortType == "asc" ? 1 : -1
    }
   })

   const options = {
    page:parseInt(page,10),
    limit:parseInt(limit,10)
   }

   const videos = await Video.aggregatePaginate(Video.aggregate(pipeline),options) 
   if (!videos) {
    throw new ApiError(500, "Failed to fetch videos");
  }
  return res
   .status(200)
   .json(new ApiResponse(200, "Videos fetched successfully", {
    totalPages: videos.totalPages,
    currentPage: videos.page,
    videos: videos.docs,
    totalDocs: videos.totalDocs,
    limit: videos.limit,
    page: videos.page,
    total: videos.total
   }));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const videoLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  if (!videoLocalPath && !thumbnailLocalPath) {
    throw new ApiError(404, "Video and thumbnail are required");
  }
  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  //   console.log("Video info \n",video);
  const uploadedVideo = await Video.create({
    title,
    description,
    videoFile: video.url,
    thumbnail: thumbnail.url,
    duration: video.duration, // duration in seconds
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "videoOwner",
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
           // get the likes of the videos
           $lookup:{
            from:"likes",
            localField:"_id",
            foreignField:"video",
            as:"likes"
           }
    },
    {
       // get the comments of the videos
       $lookup:{
        from:"comments",
        localField:"_id",
        foreignField:"video",
        as:"comments",
        pipeline:[
          {
            $project:{
              content:1,
              owner:1,
              createdAt:1
            }
          }
        ]
       }

    },
    {
      $addFields: {
        owner: {
          $arrayElemAt: ["$videoOwner", 0],
        },
        likesCount:{
           $size : "$likes"
        },
        commentsCount:{
          $size :"$comments"
        },
        isLiked:{
          $cond:[
            {
              $in: [req.user?._id, "$likes.likedBy"] 
            },
            true,
            false
          ]
        }
      },
    },
    {
      $project:{
        title: 1,
        description: 1,
        videoFile: 1,
        thumbnail: 1,
        duration: 1,
        view: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
        likesCount: 1,
        commentsCount: 1,
        owner: 1,
        comments: 1,
        isLiked: 1
      }
    }
  ]);
  if (!video || video.length === 0) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let updatedFields = {};
  //TODO: update video details like title, description, thumbnail
  if (!videoId) {
    throw new ApiError(404, "video does not exisits");
  }
  const { newTitle, newDescription } = req.body;
  if (newTitle) updatedFields.title = newTitle;
  if (newDescription) updatedFields.description = newDescription;

  const newThumbnailLocalPath = req.file?.path;
  if (newThumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
    updatedFields.thumbnail = thumbnail.url;
  }
  if (Object.keys(updatedFields).length === 0) {
    throw new ApiError("400", "Atleast one field is required to update");
  }

  const updatedVideo = await Video.findOneAndUpdate(
    { _id: videoId },
    {
      $set: updatedFields,
    },
    {
      new: true,
    }
  );
  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!videoId) {
    throw new ApiError(404, "video does not exisits");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new ApiError(404, "Video not found"));
  }

  if (video?.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not authorized to delete this video");
  }
  try {
    const videoFilePublicId = video?.videoFile?.split("/").pop().split(".")[0];
    const thumbnailPublicId = video?.thumbnail?.split("/").pop().split(".")[0];

    const videoFileDeletefromCloud =
      await deleteOnCloudinary(videoFilePublicId);

    const thumbnailDeletefromCloud =
      await deleteOnCloudinary(thumbnailPublicId);

    console.log(
      "Video file and thumbnail deleted from the cloudinary...",
      videoFileDeletefromCloud,
      thumbnailDeletefromCloud
    );
  } catch (error) {
    console.log("Error in deleting video from cloudinary", error);
    throw new ApiError(500, "Internal server error");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo)
    throw new ApiError(500, "Error deleting video try again later");

  // deleting the video comment from the Comment entity
  await Comment.deleteMany({
    video: videoId,
    owner: req.user._id,
  });
  // deleting the video likes from the likes entity
  await Like.deleteMany({
    video: videoId,
    likedBy: req.user._id,
  });
  // deleting the video from the playlist entity
  await Playlist.deleteMany({
    videos: videoId,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(404, "video does not exisits");
  }
  const videoExist = await Video.findById(videoId);

  if (videoExist?.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "You are not authorized to update or toggle this video"
    );
  }
  const updatedVideo = await Video.findOneAndUpdate(
    { _id: videoId },
    [{ $set: { isPublished: { $not: "$isPublished" } } }],
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Publish status toggled successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
