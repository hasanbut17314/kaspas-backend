import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";

const totalAnalytics = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();

    const revenueFunc = await Order.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" }
            }
        }
    ]);

    const revenue = revenueFunc.length > 0 ? revenueFunc[0].total : 0;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalUsers,
                totalOrders,
                totalProducts,
                revenue
            },
            "Analytics fetched successfully"
        )
    );
})

const topProducts = asyncHandler(async (req, res) => {
    const topProducts = await Order.aggregate([
        {
            $unwind: "$orderItems"
        },
        {
            $group: {
                _id: "$orderItems.prodId",
                quantity: { $sum: "$orderItems.quantity" },
                totalPrice: { $sum: "$orderItems.totalPrice" }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $project: {
                _id: 0,
                quantity: 1,
                totalPrice: 1,
                title: { $arrayElemAt: ["$product.title", 0] },
                price: { $arrayElemAt: ["$product.price", 0] },
            }
        },
        {
            $sort: {
                totalPrice: -1
            }
        },
        {
            $limit: 5
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            topProducts,
            "Top products fetched successfully"
        )
    );
})

const salesByCategory = asyncHandler(async (req, res) => {
    const salesByCategory = await Order.aggregate([
        {
            $unwind: "$orderItems"
        },
        {
            $lookup: {
                from: "products",
                localField: "orderItems.prodId",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: "$product"
        },
        {
            $group: {
                _id: "$product.category",
                totalSales: { $sum: "$orderItems.totalPrice" }
            }
        },
        {
            $sort: {
                totalSales: -1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            salesByCategory,
            "Sales by category fetched successfully"
        )
    );
})

const getMonthlySalesOverview = asyncHandler(async (req, res) => {
    const {
        startDate = new Date(new Date().getFullYear(), 0, 1),
        endDate = new Date(),
        groupBy = 'month'
    } = req.query;

    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new ApiError(400, 'Invalid date format');
    }

    const salesOverview = await Order.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: {
                    ...(groupBy === 'month' ? {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    } : {
                        year: { $year: '$createdAt' }
                    })
                },
                totalSales: { $sum: '$totalPrice' },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: '$totalPrice' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
            $project: {
                _id: 0,
                month: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$_id.month', 1] }, then: 'Jan' },
                            { case: { $eq: ['$_id.month', 2] }, then: 'Feb' },
                            { case: { $eq: ['$_id.month', 3] }, then: 'Mar' },
                            { case: { $eq: ['$_id.month', 4] }, then: 'Apr' },
                            { case: { $eq: ['$_id.month', 5] }, then: 'May' },
                            { case: { $eq: ['$_id.month', 6] }, then: 'Jun' },
                            { case: { $eq: ['$_id.month', 7] }, then: 'Jul' },
                            { case: { $eq: ['$_id.month', 8] }, then: 'Aug' },
                            { case: { $eq: ['$_id.month', 9] }, then: 'Sep' },
                            { case: { $eq: ['$_id.month', 10] }, then: 'Oct' },
                            { case: { $eq: ['$_id.month', 11] }, then: 'Nov' },
                            { case: { $eq: ['$_id.month', 12] }, then: 'Dec' }
                        ],
                        default: 'Unknown'
                    }
                },
                sales: '$totalSales',
                orders: '$totalOrders',
                avgOrderValue: { $round: ['$avgOrderValue', 2] }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, salesOverview, 'Monthly sales overview retrieved successfully')
    );
});

export { totalAnalytics, topProducts, salesByCategory, getMonthlySalesOverview };