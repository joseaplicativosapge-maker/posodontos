import React, { useMemo, useState } from 'react';
import { Product, Branch } from '../types';
import { QrCode, Printer, Share2, Smartphone, Scissors, Copy, Check, ArrowRight, CalendarCheck, Info, Monitor, Tablet, Download } from 'lucide-react';
import { PublicMenu } from './PublicMenu';
import { PublicReservation } from './PublicReservation';

interface QrMenuViewProps {
  products: Product[];
  currentBranch: Branch | undefined;
}

export const QrMenuView: React.FC<QrMenuViewProps> = ({ products, currentBranch }) => {
  const [copied, setCopied] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [previewMode, setPreviewMode] = useState<'menu' | 'reservation'>('menu');
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const origin = typeof window !== 'undefined' ? window.location.origin + '/posodontos' : 'https://odontos.app';
  const menuUrl = `${origin}/menu/${currentBranch?.id || 'demo'}`;
  const reservationUrl = `${origin}/reserva/${currentBranch?.id || 'demo'}`;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(menuUrl)}&bgcolor=ffffff&color=000000&margin=10`;
  const qrReservationUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reservationUrl)}&bgcolor=ffffff&color=000000&margin=10`;

  const handleCopyLink = (url: string, isRes: boolean) => {
    navigator.clipboard.writeText(url);
    if (isRes) { 
      setCopiedRes(true); 
      setTimeout(() => setCopiedRes(false), 2000); 
    } else { 
      setCopied(true); 
      setTimeout(() => setCopied(false), 2000); 
    }
  };

  const handleDownloadQR = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = (title: string, subtitle: string, qrUrl: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const branchName = currentBranch?.name || 'BarberOS Restaurant';
    const logoHtml = currentBranch?.logoUrl ? `<img src="${currentBranch.logoUrl}" style="max-height: 100px; margin-bottom: 30px; object-fit: contain;">` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>BarberOS Print - ${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; text-align: center; padding: 0; margin: 0; color: #1e293b; background: white; }
            .page { height: 100vh; display: flex; flex-col; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box; }
            .container { border: 4px solid #f1f5f9; padding: 80px 60px; border-radius: 60px; display: inline-block; max-width: 600px; width: 100%; position: relative; }
            .badge { background: #cc6600; color: white; padding: 12px 30px; border-radius: 25px; font-weight: 900; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; display: inline-block; box-shadow: 0 10px 20px rgba(204,102,0,0.2); }
            h1 { font-size: 42px; font-weight: 900; margin: 15px 0; text-transform: uppercase; letter-spacing: -1.5px; line-height: 1; }
            p { font-size: 20px; color: #64748b; margin-bottom: 50px; font-weight: 500; }
            .qr-frame { background: white; padding: 30px; border-radius: 40px; box-shadow: 0 30px 60px rgba(0,0,0,0.1); display: inline-block; border: 1px solid #f1f5f9; margin-bottom: 40px; }
            .qr-image { width: 350px; height: 350px; }
            .brand-footer { margin-top: 20px; font-size: 14px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 5px; }
            @media print {
              body { padding: 0; }
              .container { border: none; }
              .page { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="container">
              ${logoHtml}
              <div class="badge">${branchName}</div>
              <h1>${title}</h1>
              <p>${subtitle}</p>
              <div class="qr-frame">
                <img src="${qrUrl}" class="qr-image" />
              </div>
              <div class="brand-footer">BarberOS CLOUD</div>
            </div>
          </div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 700);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const branchData = useMemo(() => currentBranch || {
    id: 'demo',
    companyId: 'c1',
    name: 'Restaurante Demo',
    address: 'Calle Ficticia 123',
    isActive: true,
    businessHours: 'Lun-Dom 12:00 - 22:00'
  }, [currentBranch]);

  // Responsive device dimensions
  const deviceDimensions = {
    mobile: { width: 'w-[400px]', height: 'h-[700px]', scale: 'scale-100' },
    tablet: { width: 'w-[600px]', height: 'h-[800px]', scale: 'scale-90' },
    desktop: { width: 'w-full max-w-[1200px]', height: 'h-[800px]', scale: 'scale-100' }
  };

  const currentDevice = deviceDimensions[deviceView];

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      <div className="w-full mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-3">
              <QrCode className="text-brand-600" size={32} />
              Servicios Digitales & Reservas
            </h2>
            <p className="text-slate-500 mt-2 max-w-xl font-medium uppercase text-[10px] tracking-widest">
                Visualice y gestione sus puntos de acceso para clientes finales.
            </p>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
          
          <div className="xl:col-span-5 space-y-8">
              <div className="grid grid-cols-1 gap-8">
                  {/* CARTA DIGITAL QR */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative group transition-all hover:shadow-2xl">
                      <div className="bg-brand-600 h-32 relative flex flex-col items-center justify-center overflow-hidden">
                           <div className="bg-white/20 p-2 rounded-xl mb-1 backdrop-blur-md relative z-10"><Scissors size={24} className="text-white" /></div>
                           <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em] relative z-10">CARTA DIGITAL</h3>
                           <div className="absolute -right-4 -bottom-4 bg-white/5 w-24 h-24 rounded-full"></div>
                      </div>
                      <div className="p-8 text-center relative pt-20">
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white p-3 rounded-3xl shadow-2xl border-4 border-white">
                              <img src={qrCodeUrl} alt="Menu QR" className="w-32 h-32 object-contain rounded-xl" />
                          </div>
                          <div>
                              <h4 className="font-black text-slate-800 mb-4 uppercase text-[10px] tracking-widest">Escanea el Servicio</h4>
                              <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 items-center overflow-hidden mb-4">
                                  <span className="text-[9px] text-slate-400 font-mono truncate flex-1 px-2">{menuUrl}</span>
                                  <button onClick={() => handleCopyLink(menuUrl, false)} className="bg-white p-2 rounded-xl shadow-sm text-brand-600 hover:scale-110 transition-transform">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                                  </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPreviewMode('menu')} className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${previewMode === 'menu' ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                   Vista Previa
                                </button>
                                <button onClick={() => handleDownloadQR(qrCodeUrl, 'menu-qr.png')} className="bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                     <Download size={14}/> Descargar
                                </button>
                              </div>
                              <button onClick={() => handlePrintQR("Nuestro Servicios Digitales", "Escanea para ver los platos y delicias de hoy", qrCodeUrl)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 mt-2">
                                   <Printer size={14}/> Imprimir QR
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* RESERVAS ONLINE QR */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative group transition-all hover:shadow-2xl">
                      <div className="bg-slate-900 h-32 relative flex flex-col items-center justify-center overflow-hidden">
                           <div className="bg-brand-500/20 p-2 rounded-xl mb-1 backdrop-blur-md relative z-10"><CalendarCheck size={24} className="text-brand-500" /></div>
                           <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em] relative z-10">RESERVAS ONLINE</h3>
                           <div className="absolute -left-4 -top-4 bg-white/5 w-24 h-24 rounded-full"></div>
                      </div>
                      <div className="p-8 text-center relative pt-20">
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white p-3 rounded-3xl shadow-2xl border-4 border-white">
                              <img src={qrReservationUrl} alt="Reservation QR" className="w-32 h-32 object-contain rounded-xl" />
                          </div>
                          <div>
                              <h4 className="font-black text-slate-800 mb-4 uppercase text-[10px] tracking-widest">Agenda tu Silla</h4>
                              <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 items-center overflow-hidden mb-4">
                                  <span className="text-[9px] text-slate-400 font-mono truncate flex-1 px-2">{reservationUrl}</span>
                                  <button onClick={() => handleCopyLink(reservationUrl, true)} className="bg-white p-2 rounded-xl shadow-sm text-brand-600 hover:scale-110 transition-transform">
                                    {copiedRes ? <Check size={14}/> : <Copy size={14}/>}
                                  </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPreviewMode('reservation')} className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${previewMode === 'reservation' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                   Vista Previa
                                </button>
                                <button onClick={() => handleDownloadQR(qrReservationUrl, 'reserva-qr.png')} className="bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                     <Download size={14}/> Descargar
                                </button>
                              </div>
                              <button onClick={() => handlePrintQR("Reservas Online", "Escanea y asegura tu silla al instante sin filas", qrReservationUrl)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 mt-2">
                                   <Printer size={14}/> Imprimir QR
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
            
          {/* PREVIEW SECTION */}
          <div className="xl:col-span-7 flex flex-col items-center">
              <div className="w-full flex flex-col md:flex-row items-center justify-between mb-6 gap-4 px-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Monitor size={16} className="text-brand-600"/> Vista Previa Responsiva
                  </h3>
                  <div className="flex flex-wrap gap-2">
                      {/* Selector de Contenido */}
                      <div className="flex bg-slate-200 rounded-lg p-1">
                          <button onClick={() => setPreviewMode('menu')} className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${previewMode === 'menu' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Scissors size={14}/> Servicio
                          </button>
                          <button onClick={() => setPreviewMode('reservation')} className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${previewMode === 'reservation' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <CalendarCheck size={14}/> Reserva
                          </button>
                      </div>
                      {/* Selector de Dispositivo */}
                      <div className="flex bg-slate-200 rounded-lg p-1">
                          <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-md transition-all ${deviceView === 'mobile' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Móvil">
                            <Smartphone size={14}/>
                          </button>
                          <button onClick={() => setDeviceView('tablet')} className={`p-2 rounded-md transition-all ${deviceView === 'tablet' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Tablet">
                            <Tablet size={14}/>
                          </button>
                          <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-md transition-all ${deviceView === 'desktop' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Desktop">
                            <Monitor size={14}/>
                          </button>
                      </div>
                  </div>
              </div>

              {/* Device Preview */}
              {deviceView === 'mobile' && (
                <div className="relative w-[400px] h-[700px] bg-slate-800 rounded-[3rem] border-[8px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden">        
                    <div className="absolute top-0 left-0 w-full h-7 bg-transparent z-[60] flex justify-between items-center px-8">
                        <span className="text-[10px] font-bold text-white/80">9:41</span>
                        <div className="flex gap-1.5 items-center">
                          <div className="w-3 h-2 bg-white/40 rounded-sm"></div>
                          <div className="w-4 h-2 bg-white/40 rounded-sm"></div>
                        </div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-b-2xl z-[70]"></div>
                    <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border overflow-y-auto">
                          {previewMode === 'menu' ? (
                              <PublicMenu products={products} branch={branchData as Branch} />
                          ) : (
                              <PublicReservation branch={branchData as Branch} />
                          )}
                     </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-400/20 rounded-full z-[60]"></div>
                </div>
              )}

              {deviceView === 'tablet' && (
                <div className="relative w-[600px] h-[800px] bg-slate-800 rounded-[2rem] border-[6px] border-slate-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden">
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden overflow-y-auto">
                        {previewMode === 'menu' ? (
                            <PublicMenu products={products} branch={branchData as Branch} />
                        ) : (
                            <PublicReservation branch={branchData as Branch} />
                        )}
                    </div>
                </div>
              )}

              {deviceView === 'desktop' && (
                <div className="w-full max-w-[1200px] h-[800px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden overflow-y-auto">
                    {previewMode === 'menu' ? (
                        <PublicMenu products={products} branch={branchData as Branch} />
                    ) : (
                        <PublicReservation branch={branchData as Branch} />
                    )}
                </div>
              )}
          </div>
      </div>

      {/* GUÍA RÁPIDA */}
      <div className="w-full mt-12">
            <div className="w-full p-10 bg-gradient-to-br from-brand-50 to-white rounded-[2.5rem] border border-brand-100 flex items-start gap-8 shadow-sm">
                <div className="bg-brand-600 p-5 rounded-2xl text-white shadow-lg shrink-0">
                    <Info size={28}/>
                </div>
                <div className="space-y-4">
                    <h4 className="font-black text-brand-900 uppercase text-sm tracking-widest">Guía Rápida de Implementación</h4>
                    <ul className="text-brand-700 text-sm leading-relaxed space-y-2 list-disc pl-6">
                        <li><strong>Descarga o imprime</strong> los códigos QR desde los botones correspondientes</li>
                        <li><strong>Colócalos estratégicamente</strong> en sillas, entrada, ventanas o stands</li>
                        <li><strong>Actualiza tu servicio</strong> desde el módulo de Productos y se verá en tiempo real</li>
                        <li><strong>Usa la vista previa</strong> para validar la experiencia en diferentes dispositivos</li>
                        <li><strong>Comparte los enlaces</strong> en redes sociales, WhatsApp y Google Business</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
};