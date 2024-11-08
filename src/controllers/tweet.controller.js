import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { tweetContent } = req.body;
  if (!tweetContent) {
    throw new ApiError(400, "Add a tweet to publish");
  }
  const tweet = await Tweet.create({
    content: tweetContent,
    owner: req.user?._id,
  });
  if (!tweet) {
    throw new ApiError(500, "Failed to create a tweet try again");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) throw new ApiError(404, "Login");
  const userTweets = await Tweet.findOne({ owner: userId });
  if (!userTweets) throw new ApiError(404, "No tweets found");
  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {  
  const { tweetId } = req.params;  
  const { newTweet } = req.body;  

  if (!newTweet || !newTweet.trim()) {  
    throw new ApiError(400, "Provide a tweet content to update."); //More informative error  
  }  

  const tweet = await Tweet.findByIdAndUpdate(  
    tweetId,  
    { content: newTweet },  
    { new: true }  
  );  

  if (!tweet) {  
    throw new ApiError(404, "Tweet not found");  
  }  

  return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));  
});  

const deleteTweet = asyncHandler(async (req, res) => {  
  const { tweetId } = req.params;  
  const tweet = await Tweet.findByIdAndDelete(tweetId);  

  if (!tweet) {  
    throw new ApiError(404, "Tweet not found");  
  }  

  return res.status(200).json(new ApiResponse(200, tweet, "Tweet deleted successfully"));  
});  

export { createTweet, getUserTweets, updateTweet, deleteTweet };

