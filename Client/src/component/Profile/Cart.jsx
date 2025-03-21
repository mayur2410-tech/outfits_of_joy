import React, { useEffect, useState } from "react";
import './Cart.css';
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import useFavorites from "../Hooks/useFavorites.jsx"
import { FaInfoCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { getCartItems, removeFromCart, handlePayment } from './Api.js';
import { fetchProduct, placeOrder } from "../outfitcollection/api.js";
import { format } from 'date-fns';
import { useUser } from "../UserContext.jsx";
import useCart from "../Hooks/useCart.jsx";
import { toast } from "react-toastify";


export default function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const { userId, firstName, lastName, email, Phone} = useUser();
    const { favourites, toggleFavourite } = useFavorites();
    const { totalItems } = useCart();
    const email1 = email;
    const userName = firstName+lastName;
    const contact = Phone;

    const fetchCartDetails = async () => {
        try {
            const cartData = await getCartItems(userId);
            if (cartData && cartData.items) {
                const fetchedProducts = await Promise.all(
                    cartData.items.map(async (item) => {
                        const category = getCategory(item.productId);
                        const product = await fetchProduct(category, item.productId);
                        return { ...item, product };
                    })
                );
                setCartItems(fetchedProducts);
            } else {
                setCartItems([]); // Ensure empty cart updates
            }
        } catch (error) {
            toast.error("Error fetching cart details Referesh!", {
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    };

    useEffect(() => {
        if (userId) fetchCartDetails();
    }, [userId]);


    // Function to determine category based on productId
    const getCategory = (productId) => {
        const categoryMap = {
            i: "Indo-western",
            s: "Sherwani",
            t: "Tuxedo",
            l: "Lehenga",
            g: "Gown",
            a: "Anarkali",
        };
        const categoryKey = productId.charAt(0).toLowerCase();
        return categoryMap[categoryKey] || "Unknown";
    };

    const handleRemoveFromCart = async (productId) => {
        if (!userId) {
            toast.warn("Please log in to modify your cart.", {
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        const result = await removeFromCart(userId, productId);

        if (result.error) {
            toast.error("Failed to remove item from cart.", {
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        } else {
            toast.success("Item removed from cart successfully!", {
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            fetchCartDetails();
        }
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            toast.warn("Your cart is empty!");
            return;
        }
    
        // Calculate total deposit amount (excluding rent)
        const totalDeposit = cartItems.reduce((sum, item) => {
            return sum + (item.product?.deposit || 0) * item.quantity;
        }, 0);
    
        // Open Razorpay for the total deposit only
        const paymentResult = await handlePayment(totalDeposit, email1, userName, contact);

        if (paymentResult.success) {
            // Place orders for each item in the cart after successful payment
            for (const item of cartItems) {
                await placeOrder({
                    userId,
                    orderId: paymentResult.razorpayOrderId,
                    productId: item.productId,
                    category: getCategory(item.productId),
                    status:"",
                    quantity: item.quantity,
                    size: item.size,
                    orderDate: new Date().toISOString(),
                    fromDate: item.fromDate,
                    toDate: item.toDate
                });
    
                await removeFromCart(userId, item.productId);
            }
    
            toast.success("Checkout successful! Orders placed.");
            fetchCartDetails();
        } else {
            toast.error("Payment failed! Order not placed.");
        }
    };


    const handleRentNow = async (item) => {
        console.log(userId, email1, contact, userName)
        const amount = (item.product?.deposit || 0) * item.quantity; // Only deposit
    
        const paymentResult = await handlePayment(amount, email1, userName, contact);
    
        if (paymentResult.success) {
            await placeOrder({
                userId,
                orderId: paymentResult.razorpayOrderId,
                productId: item.productId,
                category: getCategory(item.productId),
                status:"",
                quantity: item.quantity,
                size: item.size,
                orderDate: new Date().toISOString(),
                fromDate: item.fromDate,
                toDate: item.toDate
            });
    
            await removeFromCart(userId, item.productId);
    
            toast.success("Order placed successfully!");
            fetchCartDetails();
        } else {
            toast.error("Payment failed!");
        }
    };
    

    return (
        <div id='cartmain'>
            <div id='profileview1'>
                <h2 id='Personalinfo'>Shopping Cart :</h2>
                <div id='ongoingorder' style={{ width: "90%" }}>
                    {cartItems.length > 0 ? (
                        cartItems.map((item, index) => (
                            <div key={index} id='ordermain'>
                                <div id='orderimg'>
                                    <img src={item.product?.images?.[0] || ""} alt={item.product?.title || "Product"} />
                                </div>
                                <div id='orderinfo'>
                                    <div id='upperinfo' style={{ justifyContent: "space-between", marginLeft: "2vw", marginRight: "3vw" }}>
                                        <p>{item.product?.title || "Product Title"}</p>
                                        <div id="favouriteicon" onClick={(e) => {
                                            e.preventDefault();
                                            toggleFavourite(item.product?._id);
                                        }} style={{ position: "static" }}>
                                            {favourites.has(item.product?._id) ? <span aria-label="Remove Favorite" className='hint--bottom hint--bounce'><FaHeart color="rgb(173, 46, 36)" /></span> : <span aria-label="Add to Favorite" className='hint--bottom hint--bounce'><FaRegHeart /></span>}
                                        </div>
                                        <div aria-label="Remove from Cart" className='hint--bottom hint--bounce' style={{ fontSize: "180%", color: "black", cursor: "pointer" }} onClick={() => handleRemoveFromCart(item.productId)}>
                                            <RiDeleteBin6Line />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "2vw", marginRight: "3vw", marginTop: "4vh", marginLeft: "2vw" }}>
                                        <div id='productsizes' style={{ marginTop: "0vh", marginLeft: "0vh" }}>
                                            <label>Quantity: </label>
                                            <input type="text" value={item.quantity} readOnly />
                                        </div>
                                        <div id='productsizes' style={{ marginTop: "0vh", marginLeft: "0vh" }}>
                                            <label>Size: </label>
                                            <input type="text" value={item.size} readOnly />
                                        </div>
                                    </div>
                                    <div id='middleinfo'>
                                        <div id='productprice' style={{ gap: "2vw" }}>
                                            <p id="productrent">
                                                Rent
                                                <span id='rentproduct'>₹{item.product?.rent || 0}</span>
                                                <span>For 4 days</span>
                                            </p>
                                            <p id="productmrp">
                                                MRP
                                                <span id='mrpproduct'>₹{item.product?.mrp || 0}</span>
                                            </p>
                                            <p id="productdeposit" style={{ margin: "0" }}>
                                                Deposit
                                                <span id='rentproduct'>₹{item.product?.deposit || 0}</span>
                                                <span id='refundinfo'>
                                                    <FaInfoCircle title="Refund will process within 7 days after return" />
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div id='bottominfo' style={{ marginTop: "7vh" }}>
                                        <div id='orderbuttons' style={{ margin: "0" }}>
                                            <button id='rentnowbutton' onClick={() => handleRentNow(item)}>Rent Now</button>
                                        </div>
                                        <p><span>From Date: </span>{format(new Date(item.fromDate), 'dd-MM-yyyy')}</p>
                                        <p><span>To Date: </span>{format(new Date(item.toDate), 'dd-MM-yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ margin: "4vw", fontFamily: "sans-serif", }}>Your cart is empty.</p>
                    )}
                </div>
            </div>
            <div id='sidebar'>
                <h2>Cart Summary</h2>
                <h4>Subtotal Items: {totalItems}</h4>
                <h3>Total Rent</h3>
                <p>₹{cartItems.reduce((acc, item) => acc + (item.product?.rent || 0) * item.quantity, 0)}</p>
                <h3>Deposit to Pay</h3>
                <p>₹{cartItems.reduce((acc, item) => acc + (item.product?.deposit || 0) * item.quantity, 0)}</p>
                <h3>Get Refund <FaInfoCircle title="Refund will process within 7 days after return" /></h3>
                <p>₹{cartItems.reduce((acc, item) => acc + (item.product?.deposit || 0) * item.quantity, 0) -
                    cartItems.reduce((acc, item) => acc + (item.product?.rent || 0) * item.quantity, 0)}
                </p>
                <button onClick={handleCheckout} style={{ cursor: "pointer" }}>Checkout</button>
            </div>
        </div>
    );
}
