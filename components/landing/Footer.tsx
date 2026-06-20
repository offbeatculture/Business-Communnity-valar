// import Link from "next/link"
// import { Rocket } from "lucide-react"

// export function Footer() {
//   return (
//     <footer className="border-t py-8 px-4">
//       <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
//         <div className="flex items-center gap-2">
//           <Rocket className="text-primary size-5" />
//           <span className="font-semibold text-sm">SuperFounder</span>
//         </div>
//         <div className="flex items-center gap-6 text-xs text-muted-foreground">
//           {/* <Link href="/login" className="hover:text-foreground transition-colors">
//             Log In
//           </Link> */}
//           {/* <Link href="#pricing" className="hover:text-foreground transition-colors">
//             Pricing
//           </Link> */}
//         </div>
//         <p className="text-xs text-muted-foreground">
//           &copy; {new Date().getFullYear()} SuperFounder
//         </p>
//       </div>
//     </footer>
//   )
// }
import { Leaf } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-[#C89B3C]/20 bg-[#122015] px-4 py-8 text-[#F7F0E3]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#C89B3C]/10">
            <Leaf className="size-4 text-[#D8B76A]" />
          </span>

          <div>
            <p className="text-sm font-semibold">Daily Breathwork</p>
            <p className="text-[11px] text-[#E8DDC8]/55">
              Dr. Valarmathi Srinivasan
            </p>
          </div>
        </div>

        <p className="text-xs text-[#E8DDC8]/55">
          &copy; {new Date().getFullYear()} Dr. Valarmathi Srinivasan. All
          rights reserved.
        </p>
      </div>
    </footer>
  )
}