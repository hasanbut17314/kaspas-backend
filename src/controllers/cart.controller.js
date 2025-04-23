import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";

const addItemToCart = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        throw new ApiError(400, "Product ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new ApiError(400, "Invalid product ID format");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    if (product.quantity < 1) {
        throw new ApiError(400, "Product is out of stock");
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        cart = await Cart.create({
            userId: req.user._id,
            items: []
        });
    }

    const existingItemIndex = cart.items.findIndex(
        item => item.prodId.toString() === productId.toString()
    );

    if (existingItemIndex !== -1) {
        cart.items[existingItemIndex].quantity += 1;
    } else {
        cart.items.push({
            prodId: product._id,
            quantity: 1,
            price: product.price,
            title: product.name,
            image: product.image
        });
    }

    await cart.save();

    return res.status(200).json(new ApiResponse(200, cart, "Item added to cart successfully"));
});

const incrementItemQuantity = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID format");
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    const itemIndex = cart.items.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        throw new ApiError(404, "Item not found in cart");
    }

    const product = await Product.findById(cart.items[itemIndex].prodId);

    if (!product) {
        throw new ApiError(404, "Product no longer exists");
    }

    if (cart.items[itemIndex].quantity >= product.quantity) {
        throw new ApiError(400, "Cannot add more of this item, maximum stock reached");
    }

    cart.items[itemIndex].quantity += 1;
    await cart.save();

    return res.status(200).json(new ApiResponse(200, cart, "Item quantity increased"));
});

const decrementItemQuantity = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID format");
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    const itemIndex = cart.items.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        throw new ApiError(404, "Item not found in cart");
    }

    if (cart.items[itemIndex].quantity <= 1) {
        cart.items.splice(itemIndex, 1);
    } else {
        cart.items[itemIndex].quantity -= 1;
    }

    if (cart.items.length === 0) {
        await Cart.findByIdAndDelete(cart._id);
        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Item removed and cart is now empty"
            )
        );
    } else {
        await cart.save();
        return res.status(200).json(
            new ApiResponse(
                200,
                cart,
                "Item quantity decreased"
            )
        );
    }
});

const removeItemFromCart = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ApiError(400, "Invalid item ID format");
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    const itemIndex = cart.items.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        throw new ApiError(404, "Item not found in cart");
    }

    cart.items.splice(itemIndex, 1);

    if (cart.items.length === 0) {
        await Cart.findByIdAndDelete(cart._id);
        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Item removed and cart is now empty"
            )
        );
    } else {
        await cart.save();
        return res.status(200).json(
            new ApiResponse(
                200,
                cart,
                "Item removed from cart"
            )
        );
    }
});

const getUserCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        return res.status(200).json(
            new ApiResponse(
                200,
                { items: [], totalPrice: 0 },
                "Cart is empty"
            )
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            cart,
            "Cart fetched successfully"
        )
    );
});

const getCartCount = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        return res.status(200).json(
            new ApiResponse(
                200,
                { count: 0 },
                "Cart is empty"
            )
        );
    }
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

    return res.status(200).json(
        new ApiResponse(
            200,
            { count: itemCount },
            "Cart item count fetched successfully"
        )
    )
});

const emptyCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Cart already empty"
            )
        );
    }

    await Cart.findByIdAndDelete(cart._id);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Cart emptied successfully"
        )
    );
});

export {
    addItemToCart,
    incrementItemQuantity,
    decrementItemQuantity,
    removeItemFromCart,
    getUserCart,
    getCartCount,
    emptyCart
}