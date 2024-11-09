import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// basically a user will upload a file and it will be first stored on our local server then we will upload it on the cloudinary (by passing the path of the image stored on our server) later we will return the url of the uploaded file and will delete the file from our server
const uploadOnCloudinary = async (localFilePath) => {
  // localFilePath = where the uploaded file is stored on our server i.e in public/temp folder
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded
    // console.log("cloudinary-\n",response);
    // delete the file after successfull upload
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    // remove the temporary saved file from server as file upload on cloudinary has failed
    return null;
  }
};
const deleteOnCloudinary = async (publicId) => {
  try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
  } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new Error('Failed to delete image from Cloudinary');
  }
};

export { uploadOnCloudinary ,deleteOnCloudinary};
