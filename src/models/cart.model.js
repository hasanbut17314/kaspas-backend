import mongoose, { Schema } from "mongoose";

const itemSchema = new Schema({
    prodId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    title: {
        type: String
    },
    image: {
        type: String
    }
})

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [itemSchema],
    totalPrice: {
        type: Number
    }
})

cartSchema.pre("save", function (next) {
    this.totalPrice = this.items.reduce((total, item) => total + item.quantity * item.price, 0);
    next();
})

export const Cart = mongoose.model("Cart", cartSchema)