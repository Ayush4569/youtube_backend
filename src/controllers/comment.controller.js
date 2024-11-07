import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const videoComments = await Comment.findOne({
    video: videoId,
  })
    .skip((page - 1) * limit)
    .limit(Number(limit));
    if(!videoComments){
      throw new ApiError(400,"No comments")
    }
  return res
    .status(200)
    .json(
      new ApiResponse("200", videoComments, "Comments fetched successfully")
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;
  if (!content) {
    throw new ApiError(404, "Please write something");
  }
  const comment = await Comment.create({
    content,
    owner: req.user._id,
  });
  return res.status(200).json(new ApiResponse(200, comment, "Comment addedd"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { newContent } = req.body;
  if (!commentId) {
    throw new ApiError(400, "Comment not found");
  }
  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
    },
    {
      content: newContent,
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment not found");
  }
  const deletedComment = await Comment.findOneAndDelete(
    {
      _id: commentId,
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
