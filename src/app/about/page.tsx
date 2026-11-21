import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Satellite, Target, TreePine, Binary } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4 flex items-center gap-3">
          <Info className="w-8 h-8 text-indigo-500" />
          About This Study
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          The Laguna de Bay Watershed Urban Sprawl Analysis provides open data and actionable insights on how land use is changing in one of the Philippines' most critical and rapidly urbanizing regions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Target className="w-5 h-5" />
              The Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-300">
              To track, quantify, and forecast urbanization within the Laguna de Bay watershed, equipping urban planners, environmental policymakers, and researchers with AI-driven insights to manage growth sustainably.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <TreePine className="w-5 h-5" />
              The Watershed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-300">
              The watershed covers portions of Metro Manila, Laguna, Rizal, and Quezon. It is ecologically vital, but faces immense pressure from suburban sprawl, particularly along the SLEX corridor in the south.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-6">Methodology</h2>
      <div className="space-y-6">
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <Satellite className="w-5 h-5 text-indigo-500" /> Data Sources
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4 text-zinc-600 dark:text-zinc-300">
              <p>
                Our model uses free, publicly available satellite imagery from Google Earth Engine.
                All three reference years are built from <strong>Sentinel-2</strong> at 10-metre resolution,
                with <strong>Dynamic World</strong> supplying the training labels. The 2015 layer covers a
                July 2015 – June 2016 window, because the Sentinel-2 archive begins mid-2015.
              </p>
              <p>
                Administrative boundaries are retrieved from GADM and clipped to the exact watershed boundary defined by the LLDA (Laguna Lake Development Authority).
              </p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <Binary className="w-5 h-5 text-indigo-500" /> Machine Learning Engine
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4 text-zinc-600 dark:text-zinc-300">
              <p>
                We use a <strong>Random Forest Classifier</strong> trained on hundreds of expert-verified ground truth points. The model analyzes multi-spectral bands (Red, Green, Blue, NIR, SWIR) and calculated spectral indices (NDVI, NDBI, NDWI) to assign one of 5 classes exclusively to every pixel.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                 <li><strong>Built-up:</strong> Concrete, roofs, urban infrastructure</li>
                 <li><strong>Agriculture:</strong> Plantations, rice paddies, farmed land</li>
                 <li><strong>Forest/Vegetation:</strong> Dense natural and secondary growth</li>
                 <li><strong>Water:</strong> Lake surface, major rivers, and aquaculture</li>
                 <li><strong>Open Land:</strong> Bare soil, grasslands, pre-construction areas</li>
              </ul>
              <p className="pt-2">
                A <strong>temporal consistency step</strong> aligns the three classified years (2015, 2020, 2025) so built-up land never disappears between maps. Future-year forecasting with a Cellular Automata&ndash;Markov model is planned as the next phase of the project.
              </p>
           </CardContent>
         </Card>
      </div>
      
      <div className="mt-16 text-center text-sm text-muted-foreground pt-8 border-t">
         <p>Built for the Laguna de Bay LULC Analysis Project &copy; 2026</p>
      </div>
    </div>
  );
}
