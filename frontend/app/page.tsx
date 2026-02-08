import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-[#FFF8E7]">
      <div className="bg-white p-12 rounded-3xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transform rotate-1 max-w-2xl w-full">
        <h1 className="text-6xl font-black mb-6 text-black transform -rotate-2">
          LinkPet
        </h1>
        <p className="text-xl mb-10 text-gray-800 font-bold leading-relaxed">
          你的AI伙伴，拥有它自己的生活。<br/>体验云养宠的独特乐趣。
        </p>
        <div className="flex gap-6 justify-center flex-col sm:flex-row">
          <Link 
            href="/auth/login" 
            className="px-8 py-4 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all transform hover:-rotate-1"
          >
            登录
          </Link>
          <Link 
            href="/hatch" 
            className="px-8 py-4 bg-white text-black border-2 border-black rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all transform hover:rotate-1"
          >
            开始孵化
          </Link>
        </div>
      </div>
    </main>
  );
}
