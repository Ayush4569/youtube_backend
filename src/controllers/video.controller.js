import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
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
  if (!videoId) {
    throw new ApiError(404, "video does not exisits");
  }
  const video = await Video.findById(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  console.log("Req.file",req.file);
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
  const deletedVideo = await Video.findOneAndDelete({
    _id: videoId,
  });
  if (!deletedVideo)
    throw new ApiError(500, "Error deleting video try again later");
  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(404, "video does not exisits");
  }
  const updatedVideo = await Video.findOneAndUpdate(
    { _id: videoId },
    [
      { $set: { isPublished: { $not: "$isPublished" } } },
    ],
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
