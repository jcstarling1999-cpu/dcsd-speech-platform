// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SpeechGlassKit",
    platforms: [
        .iOS(.v26),
        .macOS(.v15)
    ],
    products: [
        .library(name: "SpeechGlassKit", targets: ["SpeechGlassKit"])
    ],
    targets: [
        .target(name: "SpeechGlassKit", path: "Sources/SpeechGlassKit")
    ]
)
