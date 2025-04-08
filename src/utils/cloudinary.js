import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const extractPublicId = (url) => {
    try {
        if (!url) return null;

        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');

        const uploadIndex = pathParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) return null;

        let startIndex = uploadIndex + 1;
        if (pathParts[startIndex] && pathParts[startIndex].startsWith('v')) {
            startIndex++;
        }

        const publicIdParts = pathParts.slice(startIndex);
        let publicId = publicIdParts.join('/');

        if (publicId.includes('.')) {
            publicId = publicId.substring(0, publicId.lastIndexOf('.'));
        }

        return publicId;
    } catch (error) {
        console.error("Error extracting public ID:", error);
        return null;
    }
};

const deleteFromCloudinary = async (url) => {
    try {
        if (!url) return null;

        const publicId = extractPublicId(url);
        if (!publicId) {
            console.warn("Could not extract public ID from URL:", url);
            return null;
        }

        const resourceTypes = ['raw', 'image', 'video'];

        for (const resourceType of resourceTypes) {
            try {
                const response = await cloudinary.uploader.destroy(publicId, {
                    resource_type: resourceType
                });

                if (response.result === 'ok') {
                    console.log(`Successfully deleted ${resourceType} with public ID: ${publicId}`);
                    return response;
                }
            } catch (error) {
                console.log(`Failed to delete as ${resourceType}, trying next type`);
            }
        }

        console.warn("Could not delete file with any resource type:", publicId);
        return null;
    } catch (error) {
        console.error("Error in deleteFromCloudinary:", error.message);
        return null;
    }
};

const uploadOnCloudinary = async (fileBuffer, originalFilename, options = {}) => {
    try {
        if (!fileBuffer) return null;

        return new Promise((resolve, reject) => {
            // Default options
            const uploadOptions = {
                resource_type: "auto",
                filename_override: originalFilename,
                ...options
            };

            // Create upload stream to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            const readableStream = new Readable();
            readableStream.push(fileBuffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);
        });
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};

const updateFileOnCloudinary = async (newFileBuffer, originalFilename, oldFileUrl, options = {}) => {
    try {
        // First upload the new file
        const uploadResult = await uploadOnCloudinary(newFileBuffer, originalFilename, options);

        // If upload successful and old file exists, delete the old file
        if (uploadResult && oldFileUrl) {
            await deleteFromCloudinary(oldFileUrl);
        }

        return uploadResult;
    } catch (error) {
        console.error("Error updating file on Cloudinary:", error);
        return null;
    }
};

export {
    uploadOnCloudinary,
    deleteFromCloudinary,
    updateFileOnCloudinary,
    extractPublicId
};