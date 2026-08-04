# Ground control points from QGIS

Drop QGIS Georeferencer `.points` files here, named `<entityId>.points`
(e.g. `DZB1206-500074L008001.points`). Each file is the permanent record
of a human georeferencing session - like corners.json entries, never
discard one.

## Producing one (QGIS)

1. Layer -> Add Layer -> Add XYZ Layer with URL
   `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
   (Esri World Imagery - the same reference the site compares against).
2. Raster -> Georeferencer, open the scene mosaic:
   `https://pub-f8ac6c500eea43b28591b7b636fc9e3d.r2.dev/scans/<entityId>/cog/mosaic.tif`
   (archived by archive-scan.yml; QGIS streams it, no download needed).
   IMPORTANT: place points on the MOSAIC, not on a single segment -
   the tiling pipeline maps corners onto the same stacked mosaic.
3. Transformation settings: Polynomial 1, target CRS EPSG:4326.
4. Place 6-12 points on unambiguous landmarks spread over the WHOLE
   frame (river bends, runway intersections, coastline, wadi junctions).
   Corners of the frame matter more than the middle.
5. File -> Save GCP points as `<entityId>.points`, commit it here.

## Converting to pipeline inputs

    python3 scripts/points-to-corners.py gcp/<entityId>.points \
        --raster <mosaic.tif or --size WIDTHxHEIGHT>

Prints `corner_order` and `corners_json` for tile-declass-scene.yml,
plus the fit RMSE in metres - record that number: it is the scene's
measured accuracy and belongs in the scene's registry note.
