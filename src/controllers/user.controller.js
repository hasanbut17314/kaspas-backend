import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import { sendEmail } from "../utils/email.js"

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const generateVerificationToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const verificationToken = user.generateVerificationToken()
        user.verificationToken = verificationToken
        await user.save({ validateBeforeSave: false })
        return verificationToken
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating verification token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { firstName, lastName, email, password, confirmPassword } = req.body

    if ([password, confirmPassword, firstName, lastName, email].some((value) => value.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match")
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        isVerified: false,
        role: "user"
    })

    const verificationToken = await generateVerificationToken(user._id)

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`

    const emailResponse = await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
        <h1 style="color: #000; font-family: Arial, sans-serif;">Verify your email</h1>
        <p style="color: #000; font-family: Arial, sans-serif;">Click <a href="${verificationUrl}" style="color: blue; text-decoration: none;">here</a> to verify your email or copy and paste the link below in your browser</p>
        <p style="color: blue; font-family: Arial, sans-serif;">${verificationUrl}</p>
        <p style="color: #000; font-family: Arial, sans-serif;">This link will expire in 24 hours</p>
        <br>
        <p style="color: #000; font-family: Arial, sans-serif;">If you did not sign up for this account, you can ignore this email</p>
        `
    })

    if (!emailResponse.success) {
        throw new ApiError(403, "Failed to send verification email! Provide a valid email")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {},
                "Registered successfully! Please verify your email"
            )
        )

})

const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params

    if (!verificationToken) {
        throw new ApiError(400, "Verification token is required")
    }

    const decodedToken = jwt.verify(verificationToken, process.env.VERIFICATION_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(404, "Token is invalid or expired")
    }

    if (user.isVerified) {
        throw new ApiError(400, "User already verified")
    }

    user.isVerified = true
    user.verificationToken = null
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Email verified successfully"))

})

const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    if ([email, password].some((value) => value.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (!user.isVerified) {
        throw new ApiError(401, "Please verify your email to login")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)
    const updatedUser = await User.findById(user._id).select("-password -refreshToken -__v")

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: updatedUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {

    if (!req.user) {
        throw new ApiError(401, "Unauthorized request")
    }

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out successfully"))
})

const reCreateAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json({
                status: 200,
                success: true,
                accessToken,
                refreshToken: newRefreshToken,
                message: "Recreate access token successfully"
            })
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const updateUser = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email
    } = req.body

    if ([firstName, lastName, email].some((value) => value.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            firstName,
            lastName,
            email
        },
        {
            new: true,
            select: "-password -refreshToken -__v"
        }
    )

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"))
})

const addUser = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        role,
        password,
        confirmPassword
    } = req.body

    if ([firstName, lastName, email, role, password, confirmPassword].some((value) => value.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match")
    }

    const allowedRoles = ["admin", "user"]
    if (!allowedRoles.includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        role,
        password
    })

    if (!user) {
        throw new ApiError(500, "Failed to create user")
    }

    const newUser = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
    }

    return res.status(201).json(new ApiResponse(201, newUser, "User created successfully"))
})

const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search, role } = req.query

    const query = {};

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
        ];
    }

    if (role) {
        query.role = role;
    }

    const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })

    const totalUsers = await User.countDocuments(query)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    users,
                    pagination: {
                        page,
                        limit,
                        total: totalUsers
                    }
                },
                "Users fetched successfully"
            )
        )
})

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    const user = await User.findByIdAndDelete(id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"))
})

export {
    registerUser,
    verifyEmail,
    loginUser,
    logoutUser,
    reCreateAccessToken,
    updateUser,
    addUser,
    getAllUsers,
    deleteUser
}