// import { Card, CardContent } from "@/components/ui/card"

// export default function DashboardLoading() {
//   return (
//     <div className="max-w-4xl mx-auto pb-10">
//       {/* Welcome card skeleton */}
//       <Card className="mb-6">
//         <CardContent className="p-6">
//           <div className="h-4 w-24 bg-muted rounded mb-2 animate-pulse" />
//           <div className="h-8 w-64 bg-muted rounded mb-4 animate-pulse" />
//           <div className="h-4 w-32 bg-muted rounded animate-pulse" />
//           <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/50">
//             {[1, 2, 3].map(i => (
//               <div key={i} className="text-center">
//                 <div className="h-8 w-8 bg-muted rounded mx-auto mb-1 animate-pulse" />
//                 <div className="h-3 w-16 bg-muted rounded mx-auto animate-pulse" />
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>
//       {/* Quick action grid skeleton */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
//         {[1, 2, 3, 4].map(i => (
//           <Card key={i}>
//             <CardContent className="px-4 py-3">
//               <div className="h-12 bg-muted rounded animate-pulse" />
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//       {/* Post skeletons */}
//       {[1, 2, 3].map(i => (
//         <Card key={i} className="mb-4">
//           <CardContent className="p-4">
//             <div className="flex items-center gap-3 mb-3">
//               <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
//               <div className="h-4 w-32 bg-muted rounded animate-pulse" />
//             </div>
//             <div className="space-y-2">
//               <div className="h-3 w-full bg-muted rounded animate-pulse" />
//               <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   )
// }
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl pb-10 text-[#4B3A25]">
      <Card className="mb-6 border-[#C89B3C]/20 bg-[#F7F0E3] shadow-sm shadow-black/5">
        <CardContent className="p-6">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-[#E8DDC8]" />
          <div className="mb-4 h-8 w-64 animate-pulse rounded bg-[#E8DDC8]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[#E8DDC8]" />

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[#C89B3C]/20 pt-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-1 h-8 w-8 animate-pulse rounded bg-[#E8DDC8]" />
                <div className="mx-auto h-3 w-16 animate-pulse rounded bg-[#E8DDC8]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="border-[#C89B3C]/20 bg-[#F7F0E3] shadow-sm shadow-black/5"
          >
            <CardContent className="px-4 py-3">
              <div className="h-12 animate-pulse rounded bg-[#E8DDC8]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="mb-4 border-[#C89B3C]/20 bg-[#F7F0E3] shadow-sm shadow-black/5"
        >
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-[#E8DDC8]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#E8DDC8]" />
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-[#E8DDC8]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-[#E8DDC8]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}