import throttle from "just-throttle";
import { AD_DIVS, AD_PROVIDER, bySport, VIDEO_ADS } from "../../common";
import { local, localActions } from "./local";

const SKYSCAPER_WIDTH_CUTOFF = 1200 + 190;

class Skyscraper {
	displayed = false;

	updateDislay(initial: boolean) {
		const div = document.getElementById(AD_DIVS.rail);

		if (div) {
			const gold = !!div.dataset.gold;

			if (
				document.documentElement.clientWidth >= SKYSCAPER_WIDTH_CUTOFF &&
				!gold
			) {
				if (!this.displayed) {
					const before = () => {
						div.style.display = "block";
					};
					const after = () => {
						this.displayed = true;
					};

					if (initial) {
						// On initial load, we can batch ad request with others
						before();
						window.freestar.config.enabled_slots.push({
							placementName: AD_DIVS.rail,
							slotId: AD_DIVS.rail,
						});
						after();
					} else {
						window.freestar.queue.push(() => {
							before();
							window.freestar.newAdSlots([
								{
									placementName: AD_DIVS.rail,
									slotId: AD_DIVS.rail,
								},
							]);
							after();
						});
					}
				}
			} else {
				if (this.displayed || gold) {
					window.freestar.queue.push(() => {
						div.style.display = "none";
						window.freestar.deleteAdSlots(AD_DIVS.rail);
						this.displayed = false;
					});
				}
			}
		}
	}
}

type AdState = "none" | "gold" | "initializing" | "initialized";

abstract class AdsBase {
	private accountChecked = false;
	private uiRendered = false;
	private initAfterLoadingDone = false;
	private state: AdState = "none";

	setLoadingDone(type: "accountChecked" | "uiRendered") {
		this[type] = true;
		if (this.initAfterLoadingDone) {
			this.init();
		}
	}

	async init() {
		if (!window.enableLogging) {
			return;
		}

		// Prevent race condition by assuring we run this only after the account has been checked and the UI has been rendered, otherwise (especially when opening a 2nd tab) this was sometimes running before the UI was rendered, which resulted in no ads being displayed
		if (this.state !== "none") {
			// Must have already ran somehow?
			return;
		}

		if (!this.accountChecked || !this.uiRendered) {
			// We got the first pageview, but we're not done loading stuff, so render first ad after we finish loading
			this.initAfterLoadingDone = true;
			return;
		}

		this.state = "initializing";

		const gold = local.getState().gold;

		if (gold) {
			this.state = "gold";
		} else {
			await this.initCore();
			this.state = "initialized";
		}
	}
	abstract initCore(): Promise<void>;

	// This does the opposite of initAds. To be called when a user subscribes to gold or logs in to an account with an active subscription
	async stop() {
		await this.stopCore();
		this.state = "gold";
	}
	abstract stopCore(): Promise<void>;

	abstract adBlock(): boolean;

	abstract trackPageview(): void;

	refreshAll() {
		if (this.state === "initialized") {
			this.refreshAllCore();
		}
	}
	abstract refreshAllCore(): void;
}

export class AdsFreestar extends AdsBase {
	skyscraper = new Skyscraper();

	initCore() {
		return new Promise<void>(resolve => {
			// _disabled names are to hide from Blockthrough, so it doesn't leak through for Gold subscribers. Run this regardless of window.freestar, so Blockthrough can still work for some users.
			const divsAll = VIDEO_ADS
				? [AD_DIVS.mobile, AD_DIVS.rail]
				: [
						AD_DIVS.mobile,
						AD_DIVS.leaderboard,
						AD_DIVS.rectangle1,
						AD_DIVS.rectangle2,
						AD_DIVS.rail,
					];
			for (const id of divsAll) {
				const div = document.getElementById(`${id}_disabled`);
				if (div) {
					div.id = id;
				}
			}

			window.freestar.queue.push(() => {
				if (VIDEO_ADS && !window.mobile) {
					window.freestar.newStickyFooter("football-gm_adhesion");
				}

				// Show hidden divs. skyscraper has its own code elsewhere to manage display.
				const divsMobile = [AD_DIVS.mobile];
				const divsDesktop = VIDEO_ADS
					? []
					: [AD_DIVS.leaderboard, AD_DIVS.rectangle1, AD_DIVS.rectangle2];
				const divs = window.mobile ? divsMobile : divsDesktop;

				for (const id of divs) {
					const div = document.getElementById(id);

					if (div) {
						div.style.removeProperty("display");
					}
				}

				// Special case for rail, to tell it there is no gold
				const rail = document.getElementById(AD_DIVS.rail);
				if (rail) {
					delete rail.dataset.gold;
					this.skyscraper.updateDislay(true);
				}

				for (const id of divs) {
					window.freestar.config.enabled_slots.push({
						placementName: id,
						slotId: id,
					});
				}

				if (divs.includes(AD_DIVS.mobile)) {
					const MOBILE_AD_BOTTOM_MARGIN = 52;

					localActions.update({
						stickyFooterAd: MOBILE_AD_BOTTOM_MARGIN,
					});

					// Add margin to footer - do this manually rather than using stickyFooterAd so <Footer> does not have to re-render
					const footer = document.getElementById("main-footer");
					if (footer) {
						footer.style.paddingBottom = `${MOBILE_AD_BOTTOM_MARGIN}px`;
					}

					// Hack to hopefully stop the Microsoft ad from breaking everything
					// Maybe this is breaking country tracking in Freestar, and maybe for direct ads too?
					window.googletag = window.googletag || {};
					window.googletag.cmd = window.googletag.cmd || [];
					window.googletag.cmd.push(() => {
						window.googletag.pubads().setForceSafeFrame(true);
						window.googletag.pubads().setSafeFrameConfig({
							allowOverlayExpansion: false,
							allowPushExpansion: false,
							sandbox: true,
						});
					});
				}

				if (!window.mobile && !VIDEO_ADS) {
					// Show the logo too
					const logo = document.getElementById("bbgm-ads-logo");

					if (logo) {
						logo.style.display = "flex";
					}
				}

				window.freestar.newAdSlots(window.freestar.config.enabled_slots);

				resolve();
			});
		});
	}

	stopCore() {
		return new Promise<void>(resolve => {
			window.freestar.queue.push(() => {
				const divsAll = [
					AD_DIVS.mobile,
					AD_DIVS.leaderboard,
					AD_DIVS.rectangle1,
					AD_DIVS.rectangle2,
				];

				for (const id of divsAll) {
					const div = document.getElementById(id);

					if (div) {
						div.style.display = "none";
					}

					window.freestar.deleteAdSlots(id);
				}

				// Special case for rail, to tell it there is no BBGM gold
				const rail = document.getElementById(AD_DIVS.rail);
				if (rail) {
					rail.dataset.gold = "true";
					this.skyscraper.updateDislay(false);
				}

				localActions.update({
					stickyFooterAd: 0,
				});

				// Add margin to footer - do this manually rather than using stickyFooterAd so <Footer> does not have to re-render
				const footer = document.getElementById("main-footer");
				if (footer) {
					footer.style.paddingBottom = "";
				}

				const logo = document.getElementById("bbgm-ads-logo");
				if (logo) {
					logo.style.display = "none";
				}

				// Rename to hide from Blockthrough
				for (const id of [...divsAll, AD_DIVS.rail]) {
					const div = document.getElementById(id);

					if (div) {
						div.id = `${id}_disabled`;
					}
				}

				resolve();
			});
		});
	}

	adBlock() {
		return (
			!window.freestar ||
			!window.freestar.refreshAllSlots ||
			!window.googletag ||
			!window.googletag.pubads
		);
	}

	trackPageview() {
		// https://help.freestar.com/help/how-to-track-virtual-page-views
		window.freestar.queue.push(() => {
			window.freestar.trackPageview();
		});
	}

	refreshAllCore() {
		window.freestar.queue.push(() => {
			window.freestar.refreshAllSlots?.();
		});
	}
}

class RaptiveStickyFooterManager {
	private observerOpen: MutationObserver | undefined;
	private observerOpen2: MutationObserver | undefined;
	private observerClose: MutationObserver | undefined;

	private AD_BOTTOM_MARGIN_DESKTOP = 92;
	private AD_BOTTOM_MARGIN_MOBILE = 50;

	start() {
		this.cleanup();
		this.listenForOpen();
	}

	private getFooter(id: string) {
		// https://stackoverflow.com/a/39332340/786644 says this is faster than scanning the mutations
		const div = document.getElementById(id);

		if (div) {
			return div;
		}
	}

	private getDesktopFooter() {
		return this.getFooter("AdThrive_Footer_1_desktop");
	}

	private getTabletFooter() {
		return this.getFooter("AdThrive_Footer_1_tablet");
	}

	private getMobileFooter() {
		return this.getFooter("AdThrive_Footer_1_phone");
	}

	private listenForOpen() {
		this.observerOpen = new MutationObserver(
			throttle(() => {
				console.log("check open");
				let div = this.getDesktopFooter();

				if (div) {
					console.log("opened desktop");

					this.stopListeningForOpen();
					this.listenForOpen2(div, "desktop");
					this.listenForClose("desktop");
				}

				div = this.getTabletFooter();

				if (div) {
					console.log("opened tablet");

					this.stopListeningForOpen();
					this.listenForOpen2(div, "tablet");
					this.listenForClose("tablet");
				}

				div = this.getMobileFooter();

				if (div) {
					console.log("opened mobile");

					this.stopListeningForOpen();
					this.listenForOpen2(div, "mobile");
					this.listenForClose("mobile");
				}
			}, 500),
		);

		this.observerOpen.observe(document.body, {
			childList: true,
			attributeFilter: [],
		});
	}

	// Sometimes there is a delay for content actually appearing in the footer. But if there's no content, then nothing shows at all, so listenForOpen is not enough
	private listenForOpen2(
		div: HTMLElement,
		type: "desktop" | "tablet" | "mobile",
	) {
		if (div?.childNodes?.length > 0) {
			console.log(`opened2 initial ${type}`);
			localActions.update({
				// Tablet ad is same size as desktop
				stickyFooterAd:
					type === "mobile"
						? this.AD_BOTTOM_MARGIN_MOBILE
						: this.AD_BOTTOM_MARGIN_DESKTOP,
			});
			return;
		}

		this.observerOpen2 = new MutationObserver(
			throttle(() => {
				if (div?.childNodes?.length > 0) {
					console.log(`opened2 later ${type}`);
					localActions.update({
						// Tablet ad is same size as desktop
						stickyFooterAd:
							type === "mobile"
								? this.AD_BOTTOM_MARGIN_MOBILE
								: this.AD_BOTTOM_MARGIN_DESKTOP,
					});

					this.stopListeningForOpen2();
				}
			}, 500),
		);

		this.observerOpen2.observe(div, {
			childList: true,
			attributeFilter: [],
		});
	}

	private listenForClose(type: "desktop" | "tablet" | "mobile") {
		this.observerClose = new MutationObserver(
			throttle(() => {
				console.log("check close");
				if (
					(type === "desktop" && !this.getDesktopFooter()) ||
					(type === "tablet" && !this.getTabletFooter()) ||
					(type === "mobile" && !this.getMobileFooter())
				) {
					console.log("closed");
					localActions.update({
						stickyFooterAd: 0,
					});

					this.stopListeningForClose();

					// Need to listen for open, because we can't distinguish if this is temporarily closed between ads, or permanently closed due to clicking close button
					this.listenForOpen();
				}
			}, 500),
		);

		this.observerClose.observe(document.body, {
			childList: true,
			attributeFilter: [],
		});
	}

	private stopListeningForOpen() {
		if (this.observerOpen) {
			this.observerOpen.disconnect();
			this.observerOpen = undefined;
		}
	}

	private stopListeningForOpen2() {
		if (this.observerOpen2) {
			this.observerOpen2.disconnect();
			this.observerOpen2 = undefined;
		}
	}

	private stopListeningForClose() {
		if (this.observerClose) {
			this.observerClose.disconnect();
			this.observerClose = undefined;
		}
	}

	cleanup() {
		this.stopListeningForOpen();
		this.stopListeningForOpen2();
		this.stopListeningForClose();
	}
}

class AdsRaptive extends AdsBase {
	private raptiveId = bySport({
		baseball: "665e0cf7767eb96e18401832",
		basketball: "64b02c6a66495b53bc728959",
		football: "665e0d0b56ae7a6e182c7b04",
		hockey: "665e0cf7767eb96e18401832",
	});

	private stickyFooterManager = new RaptiveStickyFooterManager();

	async initCore() {
		return new Promise<void>((resolve, reject) => {
			this.stickyFooterManager.start();

			// These ads only display on desktop https://mail.google.com/mail/u/0/#inbox/FMfcgzQVzXVPZjkNvXbKZWNCSjkzThQV?compose=jrjtXJSkJpmqdjGzPlpjhrFZxvgxmWkLWNjhXMJrqghRTrCWXFcggBmxbNKpvRXfLrPmCwxL
			let div: HTMLElement | null = null;
			if (window.innerWidth >= 1024) {
				div = document.getElementById("raptive-placeholder-header-id");
				if (div) {
					div.classList.add("raptive-placeholder-header");
				}
			}

			window.adthrive = window.adthrive || {};
			window.adthrive.cmd = window.adthrive.cmd || [];
			window.adthrive.plugin = "adthrive-ads-manual";
			window.adthrive.host = "ads.adthrive.com";
			const s = document.createElement("script");
			s.async = true;
			s.referrerPolicy = "no-referrer-when-downgrade";
			s.src =
				"https://" +
				window.adthrive.host +
				"/sites/" +
				this.raptiveId +
				"/ads.min.js?referrer=" +
				window.encodeURIComponent(window.location.href) +
				"&cb=" +
				(Math.floor(Math.random() * 100) + 1);
			const n = document.getElementsByTagName("script")[0];
			n.parentNode!.insertBefore(s, n);
			s.onerror = err => {
				this.stickyFooterManager?.cleanup();
				reject(err);
			};

			s.onload = () => {
				// Only show this div if ad code was not blocked
				div?.style.removeProperty("display");

				resolve();
			};
		});
	}

	async stopCore() {}

	adBlock() {
		return !window.adthrive || !window.googletag || !window.googletag.pubads;
	}

	trackPageview() {}

	refreshAllCore() {
		// Automatically happens based on URL
	}
}

const ads = AD_PROVIDER === "freestar" ? new AdsFreestar() : new AdsRaptive();

export default ads;
