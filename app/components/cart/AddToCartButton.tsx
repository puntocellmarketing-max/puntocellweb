"use client";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { addToCart, type CartProduct } from "./cart-storage";
export default function AddToCartButton({product,className=""}:{product:CartProduct;className?:string}){const[added,setAdded]=useState(false);function add(){addToCart(product);setAdded(true);setTimeout(()=>setAdded(false),1600);}return <button type="button" onClick={add} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 ${className}`}>{added?<><Check className="h-4 w-4"/>Agregado</>:<><ShoppingCart className="h-4 w-4"/>Agregar</>}</button>}

