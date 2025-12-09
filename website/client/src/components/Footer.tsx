import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card/50 border-t border-border/50 pt-16 pb-8 mt-20">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/icon48.png" alt="Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-heading font-bold text-lg">YouTube Studio Assistant</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Supercharge your YouTube workflow with AI-powered content generation and multi-language translation.
            </p>
            <div className="flex gap-4">
              {/* Social Icons would go here */}
            </div>
          </div>
          
          <div>
            <h4 className="font-heading font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="https://github.com/bandioke/youtube-studio-assistant/releases" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Chrome Web Store</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-heading font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://github.com/bandioke/youtube-studio-assistant" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="https://github.com/bandioke/youtube-studio-assistant/issues" className="hover:text-primary transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-heading font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PT. HOYBEE CREATIVS DIGITAL. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Developed by <a href="https://github.com/bandioke" className="text-primary hover:underline">Bandi</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
