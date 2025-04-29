import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";
import { sendEmail, orderConfirmMailTemplate } from "../utils/email.js";

const createOrder = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, address, contactNumber, city, postalCode, items = [] } = req.body;

    if (!firstName || !lastName || !email || !address || !contactNumber || !city) {
        throw new ApiError(400, "required fields are not provided");
    }

    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Items are required to create an order");
    }

    const orderItems = [];
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const item of items) {
            const product = await Product.findById(item.prodId).session(session);

            if (!product) {
                throw new ApiError(404, `Product ${item.title} no longer exists`);
            }

            if (product.quantity < item.quantity) {
                throw new ApiError(400, `Not enough stock for ${item.title}. Available: ${product.quantity}`);
            }

            await Product.findByIdAndUpdate(
                product._id,
                { $inc: { quantity: -item.quantity } },
                { session }
            );

            orderItems.push({
                prodId: item.prodId,
                quantity: item.quantity,
                price: item.price
            });
        }

        const orderCount = await Order.countDocuments();
        const order_no = `ORD-${Date.now()}-${orderCount + 1}`;

        const order = await Order.create([{
            userId: req.user._id || null,
            firstName,
            lastName,
            email,
            order_no,
            address,
            contactNumber,
            city,
            postalCode: postalCode || null,
            orderItems,
            status: "Pending"
        }], { session });

        await Cart.findByIdAndDelete(cart._id, { session });

        await session.commitTransaction();

        return res.status(201).json(
            new ApiResponse(
                201,
                order[0],
                "Order placed successfully"
            )
        );
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

const getOrderById = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID format");
    }

    const order = await Order.findById(orderId)
        .populate("orderItems.prodId", "name image")

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (
        order.userId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
    ) {
        throw new ApiError(403, "You don't have permission to view this order");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            order,
            "Order fetched successfully"
        )
    );
});

const getUserOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user._id };

    if (status && ["Pending", "Shipped", "Delivered", "Cancelled"].includes(status)) {
        query.status = status;
    }

    const orders = await Order.find(query)
        .populate("orderItems.prodId", "name image")
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalOrders
                }
            },
            "Orders fetched successfully"
        )
    );
});

const getAllOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    if (req.user.role !== "admin") {
        throw new ApiError(403, "You don't have permission to access all orders");
    }

    const query = {};

    if (status && ["Pending", "Shipped", "Delivered", "Cancelled"].includes(status)) {
        query.status = status;
    }

    const orders = await Order.find(query)
        .populate("userId", "firstName lastName email")
        .populate("orderItems.prodId", "name image")
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalOrders
                }
            },
            "All orders fetched successfully"
        )
    );
});

const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !status) {
        throw new ApiError(400, "Order ID and status are required");
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID format");
    }

    const order = await Order.findById(orderId).populate("orderItems.prodId", "name")
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin can update order status");
    }

    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
    );

    if (status === "Shipped") {
        await sendEmail({
            to: order.email,
            subject: "Your order has been shipped",
            html: orderConfirmMailTemplate(order)
        })
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedOrder,
            `Order status updated to ${status}`
        )
    );
});

const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID format");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (order.status !== "Pending") {
        throw new ApiError(400, "Only pending orders can be cancelled. Contact support for assistance.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(
                item.prodId,
                { $inc: { quantity: item.quantity } },
                { session }
            );
        }

        order.status = "Cancelled";
        await order.save({ session });

        await session.commitTransaction();

        return res.status(200).json(
            new ApiResponse(
                200,
                order,
                "Order cancelled successfully"
            )
        );
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, "Failed to cancel order");
    } finally {
        session.endSession();
    }
});

export {
    createOrder,
    getOrderById,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    cancelOrder
}