import prisma from "@/lib/db/prisma";
import ProductCard from "../(components)/ProductCard";

interface SearchPageProps {
  searchParams: { query: string };
}

export function generateMetadata({ searchParams: { query } }: SearchPageProps) {
  return {
    title: `Search: ${query} | Flowmazon"`,
    description: `Search results for ${query} | Flowmazon"`,
  };
}

export default async function SearchPage({
  searchParams: { query },
}: SearchPageProps) {
  // get product that matches query in name or description
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: {
      id: "desc",
    },
  });

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-5xl font-bold">No results found</h1>
        <p className="py-6">Try searching for something else</p>
      </div>
    );
  }

  return (
    <div className="mg:grid-cols-2 grid grid-cols-1 gap-4 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
