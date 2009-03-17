---
layout: post
title: Inflector en inglés y español
excerpt: Como tener diferentes inflecciones para inglés y español.
---

Algo que se le olvido al _core team_ de Rails cuando agregaron soporte para i18n
fue darle soporte en las inflecciones. Imagino que ellos suponen que si la aplicación esta en otro
idioma, entonces el código va a ser igual.

Yo prefiero tener siempre el código en inglés. Esto crea problemas para usar métodos
como _pluralize_, porque si quiero "pluralizar" palabras en español, tendría que
agregar las reglas correspondientes al _Inflector_, y esto causaria (entre otras cosas seguramente)
que Rails busque la tabla "useres" para el módelo _User_.

Una opción sería agregar cada palabra en español como regla irregular. Como se sabe
que los programadores somos bien flojos, preferiria poder hacer algo así:

{% highlight ruby %}
# config/initializers/inflections.rb
es_inflector = ActiveSupport::Inflector.new
es_inflector.inflections do |inflect|
  # Y aqui las reglas para español
end
{% endhighlight %}

{% highlight erb %}
Quiero 1 kilo de <%= es_inflector.pluralize 'tortilla' %>.
Mejor con un helper (recuerda que somos flojos):
Quiero 1 kilo de <%= es_pluralize 'tortilla' %>.
{% endhighlight %}

Y es más, Rails lo deberia hacer automático teniendo algo así:

{% highlight ruby %}
# config/initializers/inflections.rb
ActiveSupport::Inflector.inflections :lang => 'es' do |inflect|
  # Reglas aqui
end
{% endhighlight %}

{% highlight erb %}
<%= pluralize 'Tortilla', :lang => 'es' %>
{% endhighlight %}

La primera opción no funciona porque Rails usa un _Singleton_ para _ActiveSupport::Inflector::Inflections_
y entonces no puedes inicializar nuevos objetos a partir de este, ni duplicarlo, ni clonarlo...

Para la segunda, bueno, habría que hacer un parche para Rails. A ver si en un par de
semanas exploro esta idea, pero mientras, se me ocurrio un hack bien _[fugly][fugly]_:

{% highlight ruby %}
# config/initializers/inflections.rb
eval File.read(Setting.rails_inflector_file).gsub('module ActiveSupport', 'module Es')

Es::Inflector.inflections do |inflect|
  inflect.plural /([^aeiou])$/i, '\1es'
  inflect.singular /(.*)es$/i, '\1'
  inflect.plural /(.*)z$/i, '\1ces'
  inflect.singular /(.*)ces$/i, '\1z'
end
{% endhighlight %}

_Setting.rails\_inflector\_file_ simplemente nos dice donde encontrar el archivo
_active\_support/inflector.rb_. Finalmente, para usarlo:

{% highlight ruby %}
# Por supuesto que mejor con un helper, pero esta es la idea
<%= Es::Inflector.pluralize 'Tortilla' %>
{% endhighlight %}

¿Cómo ven?

[fugly]: http://onlineslangdictionary.com/definition+of/fugly "fucking ugly"
