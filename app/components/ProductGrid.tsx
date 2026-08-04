import type { EcommerceProduct } from "@/lib/ecommerce";
import ProductCard from "./ProductCard";
export default function ProductGrid({products}:{products:EcommerceProduct[]}){return <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map(product=><div key={product.id} className="flex [&>article]:max-w-none [&>article]:min-w-0 [&>article]:w-full"><ProductCard product={product}/></div>)}</div>}

