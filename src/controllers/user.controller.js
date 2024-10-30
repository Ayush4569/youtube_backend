import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// cookie options
const options = {
  httpOnly: true,
  secure: true,
};
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // add the refreshToken to the user schema i.e save it to db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  if (
    [username, fullName, email, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const exisitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (exisitedUser) {
    throw new ApiError(409, "User with same email or username already exists");
  }
  // console.log("REQ-FILES: ", req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  // check if user has uploaded coverImage or not
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }
  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  // check if user is successfully created if created then return the user object excluding password and refreshToken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while creating a user,pls try again later"
    );
  }

  return (
    res
      .status(200)
      // returning our custom apiresponse which we created
      .json(new ApiResponse(200, createdUser, "User created Successfully"))
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not registered");
  }
  const isValidPassword = await user.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(404, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // dont send pass and refreshToken while sending the user after logging in
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // delete refreshToken from db and accessToken from cookie
  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// generate new accessToken for user afer expiriaton of previous one
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized pls login to generate refreshToken");
  }
  const decodedUser = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  const user = await User.findById(decodedUser?._id);
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Token has either expired or used");
  }

  // if the incomingRefreshToken == user.refreshToken then generate new access and refresh token from the below function and save it to cookies
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, newRefreshToken },
        "Access token refreshed"
      )
    );
});

// change the password of user
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(404, "Invalid password");
  }
  // if pass is correct then update the user password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changes successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// update text fields like email,fullname
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(200, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const newAvatarLocalPath = req.file?.path;
  if (!newAvatarLocalPath) {
    throw new ApiError(400, "Avatar image required");
  }
  const newAvatar = await uploadOnCloudinary(newAvatarLocalPath);
  if (!newAvatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  //update the user avatar
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    { new: true }
  ).select("-password");
  return res.status(200).json(new ApiResponse(200, user, "Avatar updated"));
});

// update cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const newCoverImageLocalPath = req.file?.path;
  if (!newCoverImageLocalPath) {
    throw new ApiError(400, "Coverimage required");
  }
  const newCoverImage = await uploadOnCloudinary(newCoverImageLocalPath);
  if (!newCoverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }
  //update the user avatar
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: newCoverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res.status(200).json(new ApiResponse(200, user, "CoverImage updated"));
});

// writing mongodb aggregation pipelines for counting a channel subscribers and also which channels are we subscribed to. Note that mongodb aggregation piplelines works directly on mongodb and not on mongoose so if we have to match a req.user._id with some document we cant just pass _id we will have to convert it into mongodb object id using mongoose.types.objectId(req.user._id)
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // take the username of the channel from params and find that channel
  // channel is nothing but an user itself
  const { username } = req.body;
  if (!username) {
    throw new ApiError("400", "username is missing");
  }
  // find the channel along with aggregating pipelines
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // look for all the documents where our channel matches the channel documents this will return the number of documents which will indirectly return us our subscribers
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // look for all the documents where our channel matches the subscriber documents this will show that the one which is subscribed to use we are also subscribed to them. In short it will return all the channels to which we are subscribed
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscibersCount: {
          $size: "$subscribers",
        },
        channelsSubscibedToCount: {
          $size: "$subscribedTo",
        },
        isSubscriber: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscibersCount: 1,
        channelsSubscibedToCount: 1,
        isSubscriber: 1,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new ApiError("404", "Channel does not exisits");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // Start aggregation on the User collection, finding the user by _id
  const user = await User.aggregate([
    {
      // Match the document where _id matches the current user’s ID from the request
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      // Lookup to fetch videos from the 'videos' collection that match the user’s watchHistory array
      $lookup: {
        from: "videos",            // Collection to join (videos)
        localField: "watchHistory", // Field in User (array of video _id's)
        foreignField: "_id",        // Field in Video to match on
        as: "watchHistory",         // Name for the new field with the joined data

        // Pipeline for each video in watchHistory to further enhance with owner info
        pipeline: [
          {
            // Nested lookup to get owner details for each video
            $lookup: {
              from: "users",         // Collection to join (users)
              localField: "owner",   // Field in Video (owner's _id)
              foreignField: "_id",   // Field in User to match on
              as: "owner",           // Name for the field with the joined owner data
              
              // Pipeline to limit owner info
              pipeline: [
                {
                  // Project to limit owner details to username, fullName, and avatar
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
            // AddField to select the first owner result, assuming only one owner per video
            $addFields: {
              owner: {
                $first: "$owner", // Convert 'owner' array to single object
              },
            },
          },
        ],
      },
    },
  ]);

  // Send the final watch history array as JSON
  return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
