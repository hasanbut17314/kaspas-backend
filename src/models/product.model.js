import mongoose, { Schema } from "mongoose";

const productSchema = new Schema({
    name: {
        type: String,
        requred: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    image: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

export const Product = mongoose.model("Product", productSchema)