import SwiftUI

@available(iOS 26.0, macOS 15.0, *)
public struct LiquidGlassControlBar: View {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityContrast) private var accessibilityContrast

    public var onRecord: () -> Void
    public var onPause: () -> Void
    public var onStop: () -> Void

    public init(
        onRecord: @escaping () -> Void = {},
        onPause: @escaping () -> Void = {},
        onStop: @escaping () -> Void = {}
    ) {
        self.onRecord = onRecord
        self.onPause = onPause
        self.onStop = onStop
    }

    public var body: some View {
        GlassEffectContainer(spacing: 14) {
            HStack(spacing: 10) {
                Button("Record", action: onRecord)
                    .buttonStyle(.glassProminent)

                Button("Pause", action: onPause)
                    .buttonStyle(.glass)

                Button("Stop", action: onStop)
                    .buttonStyle(.glass)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassEffect(glassStyle, in: Capsule())
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Speech transport controls")
        }
    }

    private var glassStyle: Glass {
        if reduceTransparency {
            return .regular.tint(.gray)
        }

        if accessibilityContrast == .high {
            return .regular.tint(.teal.opacity(0.75))
        }

        return .regular.tint(.teal).interactive()
    }
}

#if os(iOS)
import UIKit

/// UIKit integration strategy for mixed stacks:
/// wrap `LiquidGlassControlBar` in a `UIHostingController` and place it inside
/// navigation or toolbar regions, while keeping content panes material-free.
@available(iOS 26.0, *)
public final class LiquidGlassHostingController: UIHostingController<LiquidGlassControlBar> {
    public init() {
        super.init(rootView: LiquidGlassControlBar())
    }

    @MainActor @objc dynamic required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder, rootView: LiquidGlassControlBar())
    }
}
#endif

#if os(macOS)
import AppKit

/// AppKit integration strategy for mixed stacks:
/// embed `LiquidGlassControlBar` with `NSHostingView` in toolbars/inspector chrome,
/// and reserve dense content regions for non-glass surfaces.
@available(macOS 15.0, *)
public final class LiquidGlassHostingView: NSHostingView<LiquidGlassControlBar> {
    public init() {
        super.init(rootView: LiquidGlassControlBar())
    }

    @MainActor @objc dynamic required init?(coder: NSCoder) {
        super.init(coder: coder, rootView: LiquidGlassControlBar())
    }
}
#endif

@available(iOS, introduced: 17.0, obsoleted: 26.0)
@available(macOS, introduced: 14.0, obsoleted: 15.0)
public struct LegacyMaterialControlBar: View {
    public init() {}

    public var body: some View {
        HStack(spacing: 10) {
            Button("Record") {}
            Button("Pause") {}
            Button("Stop") {}
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.regularMaterial)
        .clipShape(Capsule())
    }
}
