import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    order_no: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
        default: "Pending",
        required: true
    },
    address: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    postalCode: {
        type: String
    },
    orderItems: [{
        prodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalPrice: {
        type: Number
    }
}, { timestamps: true })

orderSchema.pre("save", function (next) {
    this.totalPrice = this.orderItems.reduce((total, item) => total + item.quantity * item.price, 0);
    next();
})

export const Order = mongoose.model("Order", orderSchema)