---
layout: post
title: Render de parciales más sencillo
excerpt: Un plugin muy útil para mostrar vistas parciales de forma más sencilla.
---

Llevo usando el plugin [better\_partials][1] casi ya un año, y se ha vuelto muy natural, así que decidi compartirlo por si alguien no esta familiarizado con el.

Lo que hace es simple; permite que en lugar de escribir esto:

{% highlight ruby %}
render :partial => 'form', :partials => { :form => form, :otra_variable => var }
{% endhighlight %}

escribas esto:

{% highlight ruby %}
partial 'form', :form => form, :otra_variable => var
{% endhighlight %}

Parece poco, pero a mi me gusta mucho más la segunda forma :)

[1]: http://github.com/jcnetdev/better_partials/tree/master "better_partials en GitHub"
