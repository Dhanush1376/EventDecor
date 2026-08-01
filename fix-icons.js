const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend', 'src', 'components', 'layout', 'TopNavbar.jsx');
let content = fs.readFileSync(file, 'utf8');

// Remove lucide-react import
content = content.replace(/import\s*\{\s*[\s\S]*?\}\s*from\s*'lucide-react';\s*/, '');

const replacements = {
  '<ArrowLeft className="text-[24px] text-on-surface group-hover:-translate-x-1 transition-transform" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[24px] text-on-surface group-hover:-translate-x-1 transition-transform">arrow_back</span>',
  '<Search className="text-[22px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[24px]">search</span>',
  '<Camera className="text-[18px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[20px]">photo_camera</span>',
  '<Heart className="text-[22px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[24px]">favorite</span>',
  '<ShoppingCart className="text-[22px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[24px]">shopping_cart</span>',
  '<LogIn className="text-[22px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[24px]">login</span>',
  '<Info className="text-[13px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[15px]">info</span>',
  '<Settings className="text-[15px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[17px]">settings</span>',
  '<User className="text-[15px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[17px]">person</span>',
  '<Package className="text-[15px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[17px]">inventory_2</span>',
  '<MapPin className="text-[15px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[17px]">location_on</span>',
  '<LogOut className="text-[15px]" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[17px]">logout</span>',
  '<X className="text-[32px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[32px] font-light">close</span>',
  '<Shield className="text-[18px] tracking-normal font-normal" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>',
  '<Heart className="text-[24px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px]">favorite</span>',
  '<ShoppingBag className="text-[24px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px]">shopping_bag</span>',
  '<User className="text-[24px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px]">person</span>',
  '<LogIn className="text-[24px] font-light" strokeWidth={1.5} />': '<span className=\"material-symbols-outlined text-[26px]\">login</span>',
  '<LogOut className="text-[24px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px]">logout</span>',
  '<Menu className="text-current w-6 h-6" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px] text-current">menu</span>',
  '<ShoppingCart className="text-[24px] font-light" strokeWidth={1.5} />': '<span className="material-symbols-outlined text-[26px]">shopping_cart</span>'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync(file, content);
console.log("Done");
