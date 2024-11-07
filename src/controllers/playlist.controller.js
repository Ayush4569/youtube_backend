import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if ((!name || name.trim() === '') && (!description || description.trim() === '')) {  
    throw new ApiError(400,"Playlist name and description are required")
  }  
  const newPlaylist = await Playlist.create(
    {
        name,
        description,
        owner:req.user._id
    }
  );

  if(!newPlaylist){
    throw new ApiError(400,"Failed to create a playlist try again")
  }
  return res.json(
    new ApiResponse(200,newPlaylist,"Playlist created successfully")
  )
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) {
    throw new ApiError(404, "Unauthorized pls login");
  }
  const userPlaylist = await Playlist.findOne({ owner: userId });

  if (!userPlaylist) {
    throw new ApiError(404, "No playlist found");
  }
  return res.json(
    new ApiResponse(200, userPlaylist, "Playlist fetched successfully")
  );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId) {
    throw new ApiError(404, "No such playlist");
  }
  const playlist = await Playlist.findById(playlistId);
  if(!playlist){
    throw new ApiError(404, "No playlist found");
  }
  return res.json(
    new ApiResponse(200, playlist, "Playlist fetched successfully")
  );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId && !videoId) {  
    throw new ApiError(400,"Playlist ID and Video ID are required")
  }  
  const addVideo = await Playlist.findOneAndUpdate(
     {
      _id:playlistId
     },
     {
        $addToSet:{ videos : videoId}
     },
     {
        new:true
     }
  )
  if(!addVideo){
    throw new ApiError(404,"Error adding video to the playlist");
  }
  return res.json(
    new ApiResponse(200,addVideo,"Video added succesfully")
  )
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!playlistId && !videoId) {  
    throw new ApiError(400,"Playlist ID and Video ID are required")
  }  
  const result = await Playlist.findOneAndUpdate(
    {
        _id:playlistId
    },
    {
        $pull : {videos:videoId}
    },
    {
        new:true
    }
  )
  if (!result) {  
    return res.status(404).json(new ApiResponse(404, [], "Playlist not found"));  
  }  
  return res.json(
    new ApiResponse(200,[],"Video deleted succesfully")
  )
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId) {
    throw new ApiError(404, "No playlist found");
  }
  await Playlist.findByIdAndDelete(playlistId);
  return res.json(new ApiResponse(200, [], "Video deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!name && !description) {
    throw new ApiError(400, "Change something to update the playlist");
  }
  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
    },
    {
      $set: { name, description },
    },
    {
      new: true,
    }
  );

  return res.json(
    new ApiResponse(200,updatePlaylist,"Playlist updated successfully")
  )
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
