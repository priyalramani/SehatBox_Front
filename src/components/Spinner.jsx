import classNames from "classnames"
import React from "react"

export function Spinner({ size = "md", className }) {
	return (
		<div
			className={classNames(
				"block border-gray-800 border-b-transparent rounded-full animate-spin",
				size === "lg"
					? "p-3 border-4 drop-shadow-lg drop-shadow-black/40"
					: size === "sm"
					? "p-1 border-2"
					: "p-2 border-3",
				className
			)}
		/>
	)
}

export function SpinnerOverlay() {
	return (
		<div className='absolute z-50 top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center'>
			<Spinner size='lg' />
		</div>
	)
}
