import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Globe, Sparkles, BarChart3, Zap, Shield, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
            <img src="/images/hero-bg.png" alt="Background" className="absolute top-0 right-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
          </div>

          <div className="container relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/20 backdrop-blur-sm shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">v1.0.0 Now Available</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-heading font-extrabold leading-[1.1] tracking-tight">
                  Supercharge Your <br />
                  <span className="text-gradient">YouTube Growth</span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  The ultimate AI assistant for creators. Generate viral titles, optimize descriptions, and translate to 110+ languages instantly.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button size="lg" className="rounded-full px-8 h-14 text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all">
                    Add to Chrome - It's Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-full px-8 h-14 text-lg border-2 hover:bg-secondary/50 backdrop-blur-sm">
                    View Demo
                  </Button>
                </div>
                
                <div className="flex items-center gap-6 pt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Free Tier Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>No Credit Card Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Privacy Focused</span>
                  </div>
                </div>
              </div>
              
              <div className="relative lg:h-[600px] flex items-center justify-center animate-fade-in-up delay-200">
                <div className="relative w-full max-w-[600px] aspect-square">
                  {/* Floating Elements */}
                  <div className="absolute top-0 right-10 w-24 h-24 glass rounded-2xl flex items-center justify-center animate-bounce-slow z-20">
                    <img src="/images/feature-ai.png" alt="AI" className="w-16 h-16 object-contain" />
                  </div>
                  <div className="absolute bottom-20 left-0 w-20 h-20 glass rounded-2xl flex items-center justify-center animate-bounce-slow delay-700 z-20">
                    <img src="/images/feature-translate.png" alt="Translate" className="w-12 h-12 object-contain" />
                  </div>
                  
                  {/* Main Screenshot Card */}
                  <div className="absolute inset-4 glass rounded-3xl p-2 shadow-2xl border border-white/40 overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                    <img src="/images/Capture.PNG" alt="App Screenshot" className="w-full h-full object-cover rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-secondary/30 relative">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4">Everything You Need to Grow</h2>
              <p className="text-muted-foreground text-lg">
                Powerful tools designed to help you reach a global audience and save hours of work.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="glass p-8 rounded-3xl glass-hover group">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Content Generator</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Generate viral titles, engaging descriptions, and SEO-optimized tags in seconds using Gemini, OpenAI, or DeepSeek.
                </p>
                <img src="/images/GenerateTitle.PNG" alt="Title Generator" className="w-full rounded-xl shadow-sm border border-border/50" />
              </div>
              
              {/* Feature 2 */}
              <div className="glass p-8 rounded-3xl glass-hover group">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">110+ Language Translation</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Automatically translate your video metadata to over 110 languages. Reach a global audience with a single click.
                </p>
                <img src="/images/MultiLanguangeAutoTranslation.PNG" alt="Translation" className="w-full rounded-xl shadow-sm border border-border/50" />
              </div>
              
              {/* Feature 3 */}
              <div className="glass p-8 rounded-3xl glass-hover group">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Layers className="w-7 h-7 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Modern & Flexible UI</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Draggable panels, dark mode support, and a beautiful interface that integrates seamlessly into YouTube Studio.
                </p>
                <img src="/images/settingdark.PNG" alt="UI" className="w-full rounded-xl shadow-sm border border-border/50" />
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-3xl blur-2xl transform rotate-3"></div>
                  <img src="/images/AutoTranslateTitle&Description.PNG" alt="Workflow" className="relative rounded-3xl shadow-2xl border border-white/20" />
                </div>
              </div>
              
              <div className="order-1 lg:order-2 space-y-8">
                <h2 className="text-3xl lg:text-4xl font-heading font-bold">
                  Seamless Integration with <br />
                  <span className="text-gradient">YouTube Studio</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">1</div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">Install & Connect</h4>
                      <p className="text-muted-foreground">Add the extension to Chrome and connect your preferred AI provider (Gemini is free!).</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">2</div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">Generate Content</h4>
                      <p className="text-muted-foreground">Open any video in YouTube Studio. Use the AI panel to generate optimized titles and descriptions.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">3</div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">Go Global</h4>
                      <p className="text-muted-foreground">Navigate to Subtitles, select languages, and let the AI translate everything automatically.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing / CTA */}
        <section id="pricing" className="py-24 bg-gradient-to-b from-background to-secondary/50">
          <div className="container max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-5xl font-heading font-bold mb-6">Start Growing Today</h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of creators who are saving time and reaching more viewers with YouTube Studio Assistant.
            </p>
            
            <div className="glass p-10 rounded-[2.5rem] border border-primary/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-500"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="text-left space-y-6">
                  <h3 className="text-2xl font-bold">Free Trial</h3>
                  <div className="text-4xl font-heading font-extrabold">
                    $0 <span className="text-lg text-muted-foreground font-normal">/ 7 days</span>
                  </div>
                  <p className="text-muted-foreground">Full access to all features. No credit card required.</p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" /> All AI Providers Supported
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" /> 110+ Languages Translation
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" /> Unlimited Generations
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-col gap-4">
                  <Button size="lg" className="w-full rounded-full h-14 text-lg shadow-lg shadow-primary/20">
                    Start Free Trial
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Lifetime license available for purchase after trial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
