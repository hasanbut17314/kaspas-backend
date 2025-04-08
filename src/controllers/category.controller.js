import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { Category } from "../models/category.model.js"
import { uploadOnCloudinary, deleteFromCloudinary, updateFileOnCloudinary } from "../utils/cloudinary.js"

const addCategory = asyncHandler(async (req, res) => {
    const { name } = req.body

    if (!name) {
        throw new ApiError(400, "Name is required")
    }

    let image = null;
    if (req.file) {
        const response = await uploadOnCloudinary(req.file.buffer, req.file.originalname)
        image = response?.secure_url
    }

    const category = await Category.create({
        name,
        image
    })

    return res.status(201).json(new ApiResponse(201, category, "Category created successfully"))
})

const updateCategory = asyncHandler(async (req, res) => {
    const { name } = req.body

    if (!name) {
        throw new ApiError(400, "Name is required")
    }

    const category = await Category.findById(req.params.id)

    if (!category) {
        throw new ApiError(404, "Category not found")
    }

    let image = category.image || null
    if (req.file) {
        const response = await updateFileOnCloudinary(req.file.buffer, req.file.originalname, category.image)
        image = response?.secure_url
    }

    const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name,
            image
        },
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, updatedCategory, "Category updated successfully"))
})

const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)

    if (!category) {
        throw new ApiError(404, "Category not found")
    }

    if (category.image) {
        await deleteFromCloudinary(category.image)
    }

    await Category.findByIdAndDelete(req.params.id)

    return res.status(200).json(new ApiResponse(200, {}, "Category deleted successfully"))
})

const getAllCategories = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query

    const query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
        ];
    }

    const categories = await Category.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })

    const totalCategories = await Category.countDocuments(query)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    categories,
                    pagination: {
                        page,
                        limit,
                        total: totalCategories
                    }
                },
                "Categories found successfully"
            )
        )
})

export {
    addCategory,
    updateCategory,
    deleteCategory,
    getAllCategories
}