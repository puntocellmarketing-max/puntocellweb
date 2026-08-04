"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { CART_EVENT, cartCount } from "./cart-storage";
export default function CartButton(){const[count,setCount]=useState(0);useEffect(()=>{const refresh=()=>setCount(cartCount());refresh();window.addEventListener(CART_EVENT,refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener(CART_EVENT,refresh);window.removeEventListener("storage",refresh);};},[]);return <Link href="/carrito" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-600" aria-label={`Carrito con ${count} artículos`}><ShoppingCart className="h-5 w-5"/>{count>0&&<span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{count>99?'99+':count}</span>}</Link>}

