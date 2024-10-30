import { Schema, model } from "mongoose";

const likeSchema = new Schema(
  {
    // user can like on video as well as on comments and tweets also hence we include video,comment,tweet in this schema
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Like = model("Like", likeSchema);
